import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  EXPENSE_CATEGORIES,
  ReceiptItemInput,
  ScannedReceiptExtraction,
} from '@/types/pennywise';
import {
  categorizeExpenseByMerchantAndItems,
  normalizeCategoryName,
  parseRawReceiptText,
} from '@/lib/receipt-intelligence';
import { roundMoney } from '@/lib/money';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';
    let ocrTextFallback = '';
    let fileBytesBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('receipt') as File | null;
      const clientOcrText = formData.get('ocrText') as string | null;

      if (clientOcrText) {
        ocrTextFallback = clientOcrText;
      }

      if (file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
          return NextResponse.json(
            {
              error:
                'Unsupported file format. Please upload a JPEG, PNG, WEBP, or HEIC receipt image.',
            },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            {
              error: 'Receipt image exceeds the 10MB limit. Please choose a smaller photo.',
            },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        fileBytesBuffer = Buffer.from(arrayBuffer);
        imageBase64 = fileBytesBuffer.toString('base64');
        mimeType = file.type || 'image/jpeg';
      }
    } else {
      const body = await request.json();
      if (body.ocrText) {
        ocrTextFallback = String(body.ocrText);
      }
      if (body.imageBase64) {
        imageBase64 = String(body.imageBase64).replace(/^data:image\/\w+;base64,/, '');
        mimeType = body.mimeType || 'image/jpeg';
        fileBytesBuffer = Buffer.from(imageBase64, 'base64');
      }
    }

    if (!imageBase64 && !ocrTextFallback.trim()) {
      return NextResponse.json(
        { error: 'No receipt image or text provided for scanning.' },
        { status: 400 }
      );
    }

    const hashSource =
      fileBytesBuffer || Buffer.from(ocrTextFallback.trim(), 'utf-8');
    const receiptHash = crypto
      .createHash('sha256')
      .update(hashSource)
      .digest('hex')
      .slice(0, 32);

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // 1. If Server-Side Gemini Vision API Key is present and we have an image, run multimodal AI extraction
    if (geminiApiKey && imageBase64 && geminiApiKey !== 'your-gemini-api-key') {
      try {
        const prompt = `You are Pennywise AI, an expert financial receipt parser and expense categorizer.
Analyze this image carefully and return ONLY a valid JSON object matching this exact schema:
{
  "isValidReceipt": boolean,
  "qualityWarning": string | null,
  "merchantName": string,
  "transactionDate": "YYYY-MM-DD",
  "totalAmount": number,
  "taxAmount": number | null,
  "items": [
    {
      "name": string,
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "suggestedCategory": one of ${JSON.stringify(EXPENSE_CATEGORIES)},
  "categoryReasoning": string
}

Rules:
1. If the image is blurry, not a receipt, or missing a legible total, set qualityWarning with a clear helpful message.
2. Do NOT blindly categorize based only on the merchant name! Always inspect the individual purchased items first (e.g., if a supermarket receipt contains medicine/pharmacy items, categorize as Healthcare; if it contains milk/produce/bread, categorize as Groceries).
3. Use today's date (${new Date().toISOString().slice(0, 10)}) only if no date is visible on the receipt.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const rawCandidateText =
            geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawCandidateText) {
            const parsed = JSON.parse(rawCandidateText);
            const items: ReceiptItemInput[] = Array.isArray(parsed.items)
              ? parsed.items.map((item: any) => ({
                  name: String(item.name || 'Item').trim(),
                  quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
                  unitPrice: roundMoney(Number(item.unitPrice) || Number(item.totalPrice) || 0),
                  totalPrice: roundMoney(Number(item.totalPrice) || 0),
                }))
              : [];

            // Cross-verify category using our item-aware categorizer if AI returned Other
            const itemAware = categorizeExpenseByMerchantAndItems(
              parsed.merchantName || '',
              items
            );
            const normalizedAiCat = normalizeCategoryName(parsed.suggestedCategory);
            const finalCategory =
              normalizedAiCat !== 'Other' ? normalizedAiCat : itemAware.category;

            const result: ScannedReceiptExtraction = {
              isValidReceipt: Boolean(parsed.isValidReceipt ?? true),
              qualityWarning: parsed.qualityWarning || undefined,
              receiptHash,
              merchantName: String(parsed.merchantName || 'Merchant').trim(),
              transactionDate:
                /^\d{4}-\d{2}-\d{2}$/.test(parsed.transactionDate)
                  ? parsed.transactionDate
                  : new Date().toISOString().slice(0, 10),
              totalAmount: roundMoney(Number(parsed.totalAmount) || 0),
              taxAmount:
                parsed.taxAmount !== null && parsed.taxAmount !== undefined
                  ? roundMoney(Number(parsed.taxAmount))
                  : undefined,
              items,
              suggestedCategory: finalCategory,
              categoryReasoning:
                parsed.categoryReasoning || itemAware.reasoning,
              extractionSource: 'gemini-vision',
            };

            return NextResponse.json({ data: result });
          }
        }
      } catch (aiError) {
        console.warn('Gemini Vision API fallback to OCR parser:', aiError);
      }
    }

    // 2. Parse OCR text via our structured Receipt Intelligence Parser
    const extraction = parseRawReceiptText(ocrTextFallback, receiptHash);
    return NextResponse.json({ data: extraction });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to process receipt image. Please try again or enter expense manually.',
      },
      { status: 500 }
    );
  }
}

