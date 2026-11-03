import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import sharp from 'sharp';
import { z } from 'zod';
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

// Schema for structured AI response
const AiExtractionSchema = z.object({
  merchant_name: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_time: z.string().nullable().optional(),
  currency: z.string().default('INR'),
  subtotal: z.number().nullable().optional(),
  discount: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  total_amount: z.number(),
  payment_method: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  category: z.string().optional(),
  category_reasoning: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().default('Item'),
        quantity: z.number().default(1),
        unit_price: z.number().default(0),
        total_price: z.number().default(0),
      })
    )
    .default([]),
  confidence: z
    .object({
      merchant_name: z.number().default(0.9),
      total_amount: z.number().default(0.9),
      purchase_date: z.number().default(0.9),
    })
    .default({ merchant_name: 0.9, total_amount: 0.9, purchase_date: 0.9 }),
  needs_review: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let currentStage = 'init';

  try {
    const contentType = request.headers.get('content-type') || '';

    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';
    let ocrTextFallback = '';
    let fileBytesBuffer: Buffer | null = null;
    let originalFileName = 'upload';
    let originalMime = 'image/jpeg';
    let originalSizeBytes = 0;

    currentStage = 'upload_parsing';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('receipt') as File | null;
      const clientOcrText = formData.get('ocrText') as string | null;

      if (clientOcrText) {
        ocrTextFallback = clientOcrText.trim();
      }

      if (file) {
        originalFileName = file.name;
        originalMime = file.type;
        originalSizeBytes = file.size;

        const isAllowedMime =
          ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ||
          file.type.startsWith('image/');

        if (!isAllowedMime) {
          console.warn(
            `[RECEIPT_SCAN_DIAGNOSTIC] Stage: ${currentStage} | Error: Unsupported MIME type "${file.type}"`
          );
          return NextResponse.json(
            {
              error:
                'Unsupported file format. Please upload a JPEG, PNG, WEBP, or HEIC receipt image.',
            },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          console.warn(
            `[RECEIPT_SCAN_DIAGNOSTIC] Stage: ${currentStage} | Error: File size ${file.size} exceeds 10MB limit`
          );
          return NextResponse.json(
            {
              error: 'Receipt image exceeds 10MB limit. Please upload a smaller photo.',
            },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        fileBytesBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await request.json();
      if (body.ocrText) {
        ocrTextFallback = String(body.ocrText).trim();
      }
      if (body.imageBase64) {
        const cleanBase64 = String(body.imageBase64).replace(/^data:image\/\w+;base64,/, '');
        fileBytesBuffer = Buffer.from(cleanBase64, 'base64');
        originalSizeBytes = fileBytesBuffer.length;
        originalMime = body.mimeType || 'image/jpeg';
      }
    }

    if (!fileBytesBuffer && !ocrTextFallback) {
      console.warn(`[RECEIPT_SCAN_DIAGNOSTIC] Stage: ${currentStage} | Error: No image or text provided`);
      return NextResponse.json(
        { error: 'No receipt image or text provided for scanning.' },
        { status: 400 }
      );
    }

    console.log(
      `[RECEIPT_SCAN_DIAGNOSTIC] Stage: upload_received | File: ${originalFileName} | Size: ${originalSizeBytes}B | MIME: ${originalMime}`
    );

    // Image Preprocessing using Sharp (Orientation correction, resolution normalization)
    let processedBuffer = fileBytesBuffer;
    if (fileBytesBuffer && fileBytesBuffer.length > 0) {
      currentStage = 'image_preprocessing';
      const prepStart = Date.now();
      try {
        const sharpInstance = sharp(fileBytesBuffer);
        const meta = await sharpInstance.metadata();

        // 1. Auto-rotate based on EXIF tag (resolves sideways/upside-down mobile camera photos)
        // 2. Downscale huge images to max 2048px (maintains text fidelity while keeping payload small)
        // 3. Convert to normalized JPEG
        processedBuffer = await sharp(fileBytesBuffer)
          .rotate()
          .resize({
            width: 2048,
            height: 2048,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        imageBase64 = processedBuffer.toString('base64');
        mimeType = 'image/jpeg';

        console.log(
          `[RECEIPT_SCAN_DIAGNOSTIC] Stage: image_preprocessing | Original: ${meta.width}x${meta.height} (${meta.format}) -> Preprocessed: ${processedBuffer.length}B in ${Date.now() - prepStart}ms`
        );
      } catch (sharpError: any) {
        console.warn(
          `[RECEIPT_SCAN_DIAGNOSTIC] Stage: image_preprocessing | Warning: Sharp preprocessing failed, using raw buffer. ${sharpError?.message}`
        );
        imageBase64 = fileBytesBuffer.toString('base64');
        mimeType = originalMime || 'image/jpeg';
      }
    }

    const hashSource = processedBuffer || Buffer.from(ocrTextFallback, 'utf-8');
    const receiptHash = crypto
      .createHash('sha256')
      .update(hashSource)
      .digest('hex')
      .slice(0, 32);

    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // MULTIMODAL AI EXTRACTION (Using Gemini 2.5 Flash Vision)
    if (geminiApiKey && imageBase64 && geminiApiKey !== 'your-gemini-api-key') {
      currentStage = 'multimodal_ai_extraction';
      const aiStart = Date.now();

      const prompt = `You are PennyWise Receipt Intelligence, an expert OCR, document understanding, and financial parsing system specializing in Indian and global retail, dining, grocery, healthcare, and utility receipts.

Analyze the provided receipt image with extreme care and extract all financial data into a strictly valid JSON object matching this schema:
{
  "merchant_name": string or null,
  "purchase_date": "YYYY-MM-DD" or null,
  "purchase_time": "HH:MM" or null,
  "currency": string,
  "subtotal": number or null,
  "discount": number or null,
  "tax": number or null,
  "total_amount": number,
  "payment_method": "UPI" | "Card" | "Cash" | "Net Banking" | "Wallet" | null,
  "invoice_number": string or null,
  "category": "Groceries" | "Food & Dining" | "Healthcare" | "Transportation" | "Bills & Utilities" | "Entertainment" | "Education" | "Travel" | "Personal Care" | "Shopping" | "Luxury" | "Other",
  "category_reasoning": string,
  "items": [
    {
      "name": string,
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ],
  "confidence": {
    "merchant_name": number,
    "total_amount": number,
    "purchase_date": number
  },
  "needs_review": boolean,
  "warnings": string[]
}

CRITICAL EXTRACTION RULES:

1. MERCHANT / STORE NAME:
- Extract the consumer-facing trade or brand name prominently displayed at the top (e.g., "Reliance Smart", "Croma", "Starbucks", "Apollo Pharmacy", "McDonald's", "Blue Tokai", "D-Mart", "Decathlon", "Zomato", "Blinkit").
- DO NOT return legal corporate licensee entities unless no brand is visible (e.g., return "McDonald's" instead of "Hardcastle Restaurants Pvt Ltd", return "Croma" instead of "Infiniti Retail Ltd", return "D-Mart" instead of "Avenue Supermarts Ltd").
- DO NOT return "Tax Invoice", "Cash Memo", "Retail Invoice", "Welcome", "Customer Copy", cashier names, addresses, or GSTIN as the merchant name.
- If merchant is genuinely unreadable or missing, return null.

2. TOTAL PURCHASE AMOUNT (HIGHEST PRIORITY):
- The total amount MUST represent the ACTUAL FINAL PAYABLE AMOUNT paid or payable by the customer for this transaction.
- You must carefully distinguish between:
  * Individual item prices / MRP
  * Subtotal / Gross Total
  * Discounts / Coupons / Festive savings / Cashback
  * Taxes (CGST, SGST, IGST, VAT, Service Tax)
  * Additional charges, round-off adjustments
  * Grand Total / Net Payable / Total Amount
  * Tendered Amount (e.g. cash handed to cashier, e.g. ₹2,000 note)
  * Change Returned / Due (e.g. ₹584 returned)
- RULE: If a customer handed a ₹2000 cash note and received ₹460 in change, the final total amount is ₹540.00 (the net bill amount), NEVER the ₹2000 cash tendered!
- RULE: Never select the first monetary value on the receipt.
- RULE: Never assume the largest monetary value is automatically the final total.
- RULE: Verify the arithmetic: Subtotal - Discount + Tax + RoundOff ≈ Final Total.
- Parse Indian formatting correctly: handles "₹", "Rs.", "INR", "/-", commas (e.g., "1,25,000.50" -> 125000.50, "33,617.00" -> 33617.00, "689/-" -> 689.00). Return clean positive numbers with up to 2 decimal places.

3. PURCHASE DATE & TIME:
- Extract the transaction date in YYYY-MM-DD format (convert DD/MM/YYYY or DD-Mon-YYYY).
- Extract purchase time in 24-hour HH:MM format if visible.
- If no date is visible on the receipt, return null instead of guessing.

4. TRANSACTION CATEGORY & REASONING:
- Categorize by examining the individual purchased items first, NOT just the merchant name!
  * Supermarket receipts containing medicines/vitamins -> "Healthcare"
  * Supermarket receipts containing fresh produce/milk/groceries -> "Groceries"
  * Electronics, apparel, gadgets, hardware -> "Shopping"
  * Dining, cafe, takeaway, restaurant -> "Food & Dining"
  * Fuel, ride, cab, parking, toll -> "Transportation"
  * Electricity, broadband, mobile, water -> "Bills & Utilities"
  * Movies, streaming, gaming -> "Entertainment"
- Provide a concise 1-sentence reasoning explaining why this category was chosen based on the items.

5. CONFIDENCE & REVIEW FLAGS:
- Calculate realistic confidence scores (0.00 to 1.00) based on visual clarity and arithmetic consistency:
  * If the grand total is explicitly labeled and matches the items/tax math, confidence.total_amount should be >= 0.95.
  * If total was ambiguous, missing, or had arithmetic conflict (> 2.0 discrepancy between subtotal-discount+tax and total), set needs_review = true and add an explanatory warning to warnings array.
  * If merchant name is doubtful or missing, set needs_review = true.
  * If the image is blurry or partially obscured, add a descriptive warning.`;

      console.log(`[RECEIPT_SCAN_DIAGNOSTIC] Stage: ai_call_start | Model: gemini-2.5-flash`);

      try {
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
                temperature: 0.0,
              },
            }),
          }
        );

        const aiDuration = Date.now() - aiStart;
        console.log(
          `[RECEIPT_SCAN_DIAGNOSTIC] Stage: ai_response | Status: ${geminiRes.status} | Duration: ${aiDuration}ms`
        );

        if (geminiRes.ok) {
          currentStage = 'json_parsing_and_validation';
          const geminiJson = await geminiRes.json();
          const rawCandidateText =
            geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (rawCandidateText) {
            const rawParsed = JSON.parse(rawCandidateText);
            const validated = AiExtractionSchema.safeParse(rawParsed);

            if (validated.success) {
              const data = validated.data;

              const items: ReceiptItemInput[] = (data.items || []).map((item) => ({
                name: String(item.name || 'Item').trim(),
                quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
                unitPrice: roundMoney(
                  Number(item.unit_price) || Number(item.total_price) || 0
                ),
                totalPrice: roundMoney(Number(item.total_price) || 0),
              }));

              // Cross-verify category with item-aware categorizer if AI was uncertain
              const itemAware = categorizeExpenseByMerchantAndItems(
                data.merchant_name || '',
                items
              );
              const normalizedAiCat = normalizeCategoryName(data.category);
              const finalCategory =
                normalizedAiCat !== 'Other' ? normalizedAiCat : itemAware.category;

              // Arithmetic discrepancy check on server
              const subtotal = data.subtotal ? roundMoney(data.subtotal) : undefined;
              const discount = data.discount ? roundMoney(data.discount) : undefined;
              const tax = data.tax ? roundMoney(data.tax) : undefined;
              const totalAmount = roundMoney(data.total_amount);

              const warnings = [...(data.warnings || [])];
              let needsReview = Boolean(data.needs_review);

              if (subtotal !== undefined && totalAmount > 0) {
                const expected = roundMoney(
                  subtotal - (discount || 0) + (tax || 0)
                );
                const diff = Math.abs(expected - totalAmount);
                if (diff > 2.0) {
                  needsReview = true;
                  warnings.push(
                    `Arithmetic check: Subtotal (${subtotal}) - Discount (${discount || 0}) + Tax (${tax || 0}) = ${expected}, but extracted total is ${totalAmount}. Please verify.`
                  );
                }
              }

              if (totalAmount <= 0) {
                needsReview = true;
                warnings.push(
                  'Extracted total amount is 0 or unverified. Please check and enter the total.'
                );
              }

              const result: ScannedReceiptExtraction = {
                isValidReceipt: totalAmount > 0 || items.length > 0,
                qualityWarning: warnings.length > 0 ? warnings[0] : undefined,
                receiptHash,
                merchantName: String(data.merchant_name || '').trim(),
                transactionDate:
                  data.purchase_date && /^\d{4}-\d{2}-\d{2}$/.test(data.purchase_date)
                    ? data.purchase_date
                    : new Date().toISOString().slice(0, 10),
                purchaseTime: data.purchase_time || undefined,
                currency: data.currency || 'INR',
                subtotal,
                discount,
                taxAmount: tax,
                totalAmount,
                paymentMethod: data.payment_method || undefined,
                invoiceNumber: data.invoice_number || undefined,
                items,
                suggestedCategory: finalCategory,
                categoryReasoning:
                  data.category_reasoning || itemAware.reasoning,
                extractionSource: 'gemini-vision',
                confidence: {
                  merchantName: Number(data.confidence?.merchant_name ?? 0.9),
                  totalAmount: Number(data.confidence?.total_amount ?? 0.9),
                  purchaseDate: Number(data.confidence?.purchase_date ?? 0.9),
                },
                needsReview,
                warnings,
              };

              console.log(
                `[RECEIPT_SCAN_DIAGNOSTIC] Stage: complete | Merchant: "${result.merchantName}" | Total: ${result.totalAmount} ${result.currency} | Items: ${result.items.length} | NeedsReview: ${result.needsReview} | TotalTime: ${Date.now() - startTime}ms`
              );

              return NextResponse.json({ data: result });
            } else {
              console.warn(
                `[RECEIPT_SCAN_DIAGNOSTIC] Stage: validation_error | Schema errors:`,
                validated.error.errors
              );
            }
          }
        } else {
          const errorBody = await geminiRes.text();
          console.warn(
            `[RECEIPT_SCAN_DIAGNOSTIC] Stage: ai_error | HTTP ${geminiRes.status}: ${errorBody.slice(0, 250)}`
          );
        }
      } catch (aiNetworkErr: any) {
        console.warn(
          `[RECEIPT_SCAN_DIAGNOSTIC] Stage: ai_network_exception | ${aiNetworkErr?.message}`
        );
      }
    }

    // FALLBACK: Structured Receipt Intelligence Parser (for OCR text or sample testing)
    currentStage = 'fallback_ocr_parser';
    console.log(
      `[RECEIPT_SCAN_DIAGNOSTIC] Stage: fallback_ocr_parser | Text length: ${ocrTextFallback.length}`
    );
    const extraction = parseRawReceiptText(ocrTextFallback, receiptHash);
    console.log(
      `[RECEIPT_SCAN_DIAGNOSTIC] Stage: complete_fallback | Merchant: "${extraction.merchantName}" | Total: ${extraction.totalAmount} | NeedsReview: ${extraction.needsReview} | TotalTime: ${Date.now() - startTime}ms`
    );
    return NextResponse.json({ data: extraction });
  } catch (error: any) {
    console.error(
      `[RECEIPT_SCAN_DIAGNOSTIC] Fatal error at stage "${currentStage}":`,
      error?.message || error
    );
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
