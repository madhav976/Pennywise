import {
  EXPENSE_CATEGORIES,
  ExpenseCategoryName,
  ReceiptItemInput,
  ScannedReceiptExtraction,
} from '@/types/pennywise';
import { roundMoney } from '@/lib/money';

interface CategoryRule {
  category: ExpenseCategoryName;
  itemKeywords: string[];
  merchantKeywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Groceries',
    itemKeywords: [
      'milk', 'bread', 'eggs', 'avocado', 'banana', 'apple', 'vegetables', 'spinach',
      'tomato', 'onion', 'potato', 'rice', 'flour', 'atta', 'dal', 'lentils', 'butter',
      'cheese', 'yogurt', 'curd', 'paneer', 'cereal', 'oats', 'olive oil', 'sugar',
      'salt', 'spices', 'chicken breast', 'produce', 'organic', 'grocery', 'basmati',
    ],
    merchantKeywords: [
      'whole foods', 'trader joe', 'kroger', 'aldi', 'bigbasket', 'blinkit', 'zepto',
      'instamart', 'dmart', 'nature basket', 'supermarket', 'fresh market', 'grocer',
    ],
  },
  {
    category: 'Food & Dining',
    itemKeywords: [
      'latte', 'espresso', 'cappuccino', 'americano', 'coffee', 'croissant', 'muffin',
      'burger', 'pizza', 'pasta', 'sushi', 'ramen', 'biryani', 'tacos', 'sandwich',
      'salad bowl', 'fries', 'Wings', 'dine-in', 'takeaway', 'dessert', 'cheesecake',
      'iced tea', 'smoothie', 'appetizer', 'entree', 'combos', 'thali',
    ],
    merchantKeywords: [
      'starbucks', 'blue tokai', 'third wave', 'cafe', 'coffee', 'restaurant', 'bistro',
      'kitchen', 'diner', 'pizzeria', 'mcdonald', 'burger king', 'kfc', 'subway',
      'swiggy', 'zomato', 'ubereats', 'doordash', 'chipotle', 'grill', 'bakery',
    ],
  },
  {
    category: 'Healthcare',
    itemKeywords: [
      'paracetamol', 'ibuprofen', 'amoxicillin', 'tablet', 'capsule', 'syrup', 'vitamin',
      'supplement', 'bandage', 'antiseptic', 'thermometer', 'prescription', 'consultation',
      'dental', 'x-ray', 'blood test', 'diagnostic', 'eye drops', 'ointment', 'inhaler',
    ],
    merchantKeywords: [
      'pharmacy', 'apollo', 'medplus', 'cvs', 'walgreens', 'hospital', 'clinic',
      'medical', 'health', 'diagnostics', 'dental', 'opticals', 'pharmeasy', '1mg',
    ],
  },
  {
    category: 'Transportation',
    itemKeywords: [
      'unleaded', 'petrol', 'diesel', 'fuel', 'gallon', 'litre', 'ride', 'trip fare',
      'toll', 'parking fee', 'metro pass', 'bus ticket', 'train ticket', 'auto',
      'cab', 'car wash', 'engine oil', 'tire', 'ev charging',
    ],
    merchantKeywords: [
      'uber', 'ola', 'lyft', 'rapido', 'shell', 'indian oil', 'bharat petroleum',
      'hp petrol', 'chevron', 'exxon', 'metro', 'transit', 'parking', 'fastag',
    ],
  },
  {
    category: 'Bills & Utilities',
    itemKeywords: [
      'electricity', 'kwh', 'water bill', 'gas cylinder', 'broadband', 'fiber',
      'internet plan', 'postpaid', 'mobile recharge', 'dth', 'utility', 'sewage',
      'maintenance charge', 'cloud storage', 'hosting',
    ],
    merchantKeywords: [
      'airtel', 'jio', 'vodafone', 'bsnl', 'bescom', 'tata power', 'adani electricity',
      'comcast', 'verizon', 'at&t', 'electric', 'water board', 'gas agency',
    ],
  },
  {
    category: 'Entertainment',
    itemKeywords: [
      'movie ticket', 'imax', 'popcorn', 'nachos', 'streaming', 'subscription',
      'concert', 'bowling', 'arcade', 'game pass', 'vinyl', 'theatre', 'recliner seat',
    ],
    merchantKeywords: [
      'netflix', 'spotify', 'pvr', 'inox', 'amc', 'bookmyshow', 'steam', 'playstation',
      'xbox', 'nintendo', 'disney', 'prime video', 'cinema',
    ],
  },
  {
    category: 'Education',
    itemKeywords: [
      'textbook', 'course', 'tuition', 'udemy', 'coursera', 'notebook', 'stationery',
      'pen set', 'exam fee', 'workshop', 'certification', 'bootcamp', 'library',
    ],
    merchantKeywords: [
      'university', 'college', 'academy', 'school', 'coursera', 'udemy', 'edx',
      'bookstore', 'crossword', 'barnes', 'skillshare',
    ],
  },
  {
    category: 'Travel',
    itemKeywords: [
      'flight', 'airfare', 'boarding', 'hotel stay', 'room night', 'resort',
      'baggage', 'visa fee', 'airbnb', 'lounge access', 'tour package', 'check-in',
    ],
    merchantKeywords: [
      'indigo', 'air india', 'vistara', 'delta', 'united', 'emirates', 'marriott',
      'hilton', 'taj hotels', 'airbnb', 'makemytrip', 'booking.com', 'expedia', 'agoda',
    ],
  },
  {
    category: 'Personal Care',
    itemKeywords: [
      'shampoo', 'conditioner', 'face wash', 'cleanser', 'moisturizer', 'sunscreen',
      'serum', 'haircut', 'styling', 'manicure', 'pedicure', 'spa', 'massage',
      'deodorant', 'body lotion', 'razor', 'grooming', 'toothpaste',
    ],
    merchantKeywords: [
      'nykaa', 'sephora', 'ulta', 'salon', 'barbershop', 'spa', 'bath & body',
      'kiehl', 'lush', 'grooming', 'wellness',
    ],
  },
  {
    category: 'Luxury',
    itemKeywords: [
      'eau de parfum', 'chronograph', 'diamond', 'gold ring', 'cashmere', 'silk scarf',
      'leather handbag', 'designer', 'caviar', 'champagne', 'fine jewelry', 'couture',
    ],
    merchantKeywords: [
      'rolex', 'gucci', 'louis vuitton', 'cartier', 'tiffany', 'prada', 'hermes',
      'chanel', 'dior', 'tanishq', 'omega',
    ],
  },
  {
    category: 'Shopping',
    itemKeywords: [
      'shirt', 't-shirt', 'jeans', 'trousers', 'jacket', 'sneakers', 'shoes',
      'dress', 'hoodie', 'socks', 'headphones', 'earbuds', 'charger', 'usb-c',
      'cable', 'keyboard', 'mouse', 'lamp', 'decor', 'cookware', 'backpack',
    ],
    merchantKeywords: [
      'zara', 'h&m', 'uniqlo', 'nike', 'adidas', 'apple', 'croma', 'best buy',
      'ikea', 'myntra', 'ajio', 'amazon', 'flipkart', 'target', 'walmart', 'mall',
    ],
  },
];

/**
 * Multi-signal AI categorization:
 * Prioritizes purchased item descriptions (weight = 3 per match) over merchant name alone (weight = 1.5),
 * fulfilling the strict requirement that categorization must analyze purchased items rather than blindly
 * relying on the merchant name.
 */
export function categorizeExpenseByMerchantAndItems(
  merchantName: string,
  items: ReceiptItemInput[],
  rawText: string = ''
): { category: ExpenseCategoryName; reasoning: string } {
  const merchantLower = (merchantName || '').toLowerCase();
  const itemsText = items.map((i) => i.name.toLowerCase()).join(' | ');
  const combinedText = `${itemsText} ${rawText.toLowerCase()}`;

  let bestCategory: ExpenseCategoryName = 'Other';
  let bestScore = 0;
  let matchedItemTerms: string[] = [];
  let matchedMerchantTerms: string[] = [];

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    const currentItemMatches: string[] = [];
    const currentMerchantMatches: string[] = [];

    for (const kw of rule.itemKeywords) {
      if (itemsText.includes(kw)) {
        score += 3.0; // High weight for explicit extracted line items
        currentItemMatches.push(kw);
      } else if (combinedText.includes(kw)) {
        score += 1.2;
        currentItemMatches.push(kw);
      }
    }

    for (const mkw of rule.merchantKeywords) {
      if (merchantLower.includes(mkw)) {
        score += 1.5;
        currentMerchantMatches.push(mkw);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
      matchedItemTerms = currentItemMatches;
      matchedMerchantTerms = currentMerchantMatches;
    }
  }

  if (bestScore === 0) {
    return {
      category: 'Other',
      reasoning:
        items.length > 0
          ? `Analyzed ${items.length} item(s) from "${merchantName || 'Receipt'}"; defaulted to Other so you can pick the exact category.`
          : `Could not match specific items for "${merchantName || 'Receipt'}".`,
    };
  }

  if (matchedItemTerms.length > 0) {
    const sampleItems = Array.from(new Set(matchedItemTerms)).slice(0, 3).join(', ');
    return {
      category: bestCategory,
      reasoning: `Categorized as ${bestCategory} based on purchased items (${sampleItems})${
        matchedMerchantTerms.length > 0 ? ` and merchant "${merchantName}"` : ''
      }.`,
    };
  }

  return {
    category: bestCategory,
    reasoning: `Categorized as ${bestCategory} based on merchant "${merchantName}".`,
  };
}

export function normalizeCategoryName(input: string | undefined | null): ExpenseCategoryName {
  if (!input) return 'Other';
  const trimmed = input.trim();
  const exact = EXPENSE_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  if (lower.includes('food') || lower.includes('dining') || lower.includes('restaurant')) {
    return 'Food & Dining';
  }
  if (lower.includes('grocer') || lower.includes('supermarket')) return 'Groceries';
  if (lower.includes('shop') || lower.includes('retail') || lower.includes('apparel')) {
    return 'Shopping';
  }
  if (lower.includes('transport') || lower.includes('fuel') || lower.includes('cab')) {
    return 'Transportation';
  }
  if (lower.includes('entertain') || lower.includes('movie')) return 'Entertainment';
  if (lower.includes('bill') || lower.includes('utilit')) return 'Bills & Utilities';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('pharma')) {
    return 'Healthcare';
  }
  if (lower.includes('educat') || lower.includes('school') || lower.includes('book')) {
    return 'Education';
  }
  if (lower.includes('travel') || lower.includes('flight') || lower.includes('hotel')) {
    return 'Travel';
  }
  if (lower.includes('personal') || lower.includes('salon') || lower.includes('care')) {
    return 'Personal Care';
  }
  if (lower.includes('luxur') || lower.includes('jewel')) return 'Luxury';
  return 'Other';
}

/**
 * Parses raw OCR text extracted from a receipt photo into structured fields.
 */
export function parseRawReceiptText(
  rawText: string,
  receiptHash: string
): ScannedReceiptExtraction {
  const cleanLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  if (cleanLines.length < 2) {
    return {
      isValidReceipt: false,
      qualityWarning:
        'The uploaded image appears blurry or unreadable. Please retake a clearer photo or enter the details below.',
      receiptHash,
      merchantName: '',
      transactionDate: new Date().toISOString().slice(0, 10),
      totalAmount: 0,
      items: [],
      suggestedCategory: 'Other',
      categoryReasoning: 'Low OCR text confidence — manual verification required.',
      rawText,
      extractionSource: 'ocr-engine',
    };
  }

  // 1. Identify Merchant Name (first non-header/non-date line)
  let merchantName = 'Merchant Receipt';
  for (const line of cleanLines.slice(0, 5)) {
    const ignored = /^(tax invoice|receipt|welcome|gstin|tel|phone|date|cashier|bill no|order)/i.test(
      line
    );
    if (!ignored && /[a-zA-Z]{2,}/.test(line)) {
      merchantName = line.replace(/[^a-zA-Z0-9\s&'.,-]/g, '').trim();
      break;
    }
  }

  // 2. Identify Date (supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY)
  let transactionDate = new Date().toISOString().slice(0, 10);
  const isoMatch = rawText.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  const dmyMatch = rawText.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (isoMatch) {
    transactionDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  } else if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    transactionDate = `${y}-${m}-${d}`;
  }

  // 3. Extract Total, Tax, and Individual Items
  let extractedTotal = 0;
  let extractedTax: number | undefined;
  const items: ReceiptItemInput[] = [];

  const totalLineRegex = /(?:grand\s*total|total\s*amount|amount\s*due|net\s*total|^total)\s*[:\-₹$€£]*\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
  const taxLineRegex = /(?:cgst|sgst|igst|gst|vat|sales\s*tax|tax)\s*(?:\(\d+%?\))?\s*[:\-₹$€£]*\s*([0-9]+(?:[.,][0-9]{1,2})?)/i;
  const itemLineRegex = /^([A-Za-z][A-Za-z0-9\s&/().,'-]{2,36}?)\s+(?:(\d+)\s*[xX*]\s*([0-9]+(?:\.[0-9]{1,2})?)\s+)?[₹$€£]?\s*([0-9]+(?:\.[0-9]{2}))$/;

  for (const line of cleanLines) {
    const tMatch = line.match(totalLineRegex);
    if (tMatch) {
      const val = parseFloat(tMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > extractedTotal) {
        extractedTotal = roundMoney(val);
      }
      continue;
    }

    const txMatch = line.match(taxLineRegex);
    if (txMatch) {
      const val = parseFloat(txMatch[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        extractedTax = roundMoney((extractedTax || 0) + val);
      }
      continue;
    }

    const iMatch = line.match(itemLineRegex);
    if (iMatch) {
      const rawName = iMatch[1].trim();
      if (
        !/^(subtotal|sub total|total|cash|change|card|visa|mastercard|discount|tip|balance|tax|gst)/i.test(
          rawName
        )
      ) {
        const qty = iMatch[2] ? parseFloat(iMatch[2]) : 1;
        const totalPrice = roundMoney(parseFloat(iMatch[4]));
        const unitPrice = iMatch[3]
          ? roundMoney(parseFloat(iMatch[3]))
          : roundMoney(totalPrice / (qty || 1));

        if (totalPrice > 0 && totalPrice < 1000000) {
          items.push({
            name: rawName,
            quantity: qty,
            unitPrice,
            totalPrice,
          });
        }
      }
    }
  }

  const itemsSum = roundMoney(
    items.reduce((sum, item) => sum + item.totalPrice, 0) + (extractedTax || 0)
  );

  let qualityWarning: string | undefined;
  if (extractedTotal <= 0 && itemsSum > 0) {
    extractedTotal = itemsSum;
    qualityWarning =
      'Receipt total line was missing or unclear; calculated total from extracted items. Please verify before saving.';
  } else if (extractedTotal <= 0 && items.length === 0) {
    qualityWarning =
      'Could not detect a valid total amount on this image. Please verify or enter the total manually.';
  }

  const { category, reasoning } = categorizeExpenseByMerchantAndItems(
    merchantName,
    items,
    rawText
  );

  return {
    isValidReceipt: extractedTotal > 0 || items.length > 0,
    qualityWarning,
    receiptHash,
    merchantName,
    transactionDate,
    totalAmount: extractedTotal,
    taxAmount: extractedTax,
    items,
    suggestedCategory: category,
    categoryReasoning: reasoning,
    rawText,
    extractionSource: 'ocr-engine',
  };
}

/**
 * Sample Receipt Presets strictly for testing the camera/OCR scanner on devices without a physical receipt.
 * Never saved automatically — always flows through the AI Receipt Review & Confirmation step.
 */
export const SAMPLE_RECEIPT_TEXTS: Record<
  string,
  { label: string; subtitle: string; rawText: string }
> = {
  groceries: {
    label: 'FreshMart Groceries Receipt',
    subtitle: 'Tests multi-item grocery categorization',
    rawText: `RELIANCE SMART SUPERSTORE
Tax Invoice #RS-90412
Date: ${new Date().toISOString().slice(0, 10)}
--------------------------------
Organic Whole Milk 2L     2 x 85.00   170.00
Hass Avocados Pack        1 x 240.00  240.00
Artisan Sourdough Bread   1 x 145.00  145.00
Free Range Brown Eggs     1 x 160.00  160.00
Extra Virgin Olive Oil    1 x 650.00  650.00
--------------------------------
Subtotal                             1365.00
GST (5%)                               68.25
Grand Total                          1433.25`,
  },
  dining: {
    label: 'Blue Tokai Coffee Receipt',
    subtitle: 'Tests cafe & dining extraction',
    rawText: `BLUE TOKAI COFFEE ROASTERS
Order #BT-4418
Date: ${new Date().toISOString().slice(0, 10)}
--------------------------------
Iced Oat Milk Latte       1 x 290.00  290.00
Almond Croissant          1 x 230.00  230.00
Avocado Sourdough Toast   1 x 340.00  340.00
--------------------------------
Subtotal                              860.00
GST (5%)                               43.00
Grand Total                           903.00`,
  },
  healthcare: {
    label: 'Target Supercenter (Pharmacy Items)',
    subtitle: 'Tests item-aware AI override over general merchant',
    rawText: `TARGET SUPERCENTER
Store #1842
Date: ${new Date().toISOString().slice(0, 10)}
--------------------------------
Paracetamol 500mg Strip   2 x 45.00    90.00
Vitamin D3 Supplements    1 x 420.00  420.00
Digital Thermometer       1 x 350.00  350.00
Antiseptic Bandages Box   1 x 120.00  120.00
--------------------------------
Subtotal                              980.00
Tax (12%)                             117.60
Grand Total                          1097.60`,
  },
};

