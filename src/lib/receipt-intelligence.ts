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
 * Parses monetary amounts formatted in Indian or international currency notations.
 * Handles:
 * - ₹1,416.00, Rs. 4,000, INR 1,25,000.50, 4,000/-, 689.00
 * - Commas in both Indian lakhs/crores grouping and international thousands
 */
export function parseIndianCurrency(raw: string | undefined | null): number | null {
  if (!raw || typeof raw !== 'string') return null;

  // Strip percentage mentions like (5%), 5%, @ 9%
  const clean = raw
    .replace(/(?:@\s*)?\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g, ' ')
    .trim()
    .replace(/[₹$€£]|(?:INR|Rs\.?)/gi, '')
    .replace(/\/-$/, '')
    .trim();

  // Find all candidate numbers on the line
  const matches = clean.match(
    /(?:[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+)(?:\.[0-9]{1,2})?/g
  );
  if (!matches || matches.length === 0) return null;

  // The monetary value on a summary line is almost always the last number
  const lastMatch = matches[matches.length - 1];
  const numStr = lastMatch.replace(/,/g, '');
  const val = parseFloat(numStr);
  return isNaN(val) ? null : roundMoney(val);
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
    .filter((l) => l.length > 0);

  if (cleanLines.length < 2) {
    return {
      isValidReceipt: false,
      qualityWarning:
        'The uploaded receipt appears blurry, blank, or unreadable. Please upload a clearer photo or enter details manually.',
      receiptHash,
      merchantName: '',
      transactionDate: new Date().toISOString().slice(0, 10),
      totalAmount: 0,
      currency: 'INR',
      items: [],
      suggestedCategory: 'Other',
      categoryReasoning: 'Low OCR text confidence — manual verification required.',
      rawText,
      extractionSource: 'ocr-engine',
      confidence: {
        merchantName: 0.1,
        totalAmount: 0.1,
        purchaseDate: 0.1,
      },
      needsReview: true,
      warnings: ['Unable to read legible text on this receipt image.'],
    };
  }

  // 1. Identify Merchant Name
  let merchantName = '';
  const headerIgnoreRegex =
    /^(tax invoice|retail invoice|cash memo|credit memo|receipt|welcome|gstin|tel|phone|date|time|cashier|bill no|order #|customer copy|duplicate copy|branch|store #)/i;

  for (const line of cleanLines.slice(0, 6)) {
    if (headerIgnoreRegex.test(line)) continue;
    const hasLetters = /[a-zA-Z]{3,}/.test(line);
    const isAddressOrContact =
      /\b(?:road|street|nagar|marg|floor|bangalore|delhi|mumbai|chennai|hyderabad|pincode|ph:|tel:|\+91)\b/i.test(
        line
      );
    if (hasLetters && !isAddressOrContact) {
      const clean = line
        .replace(/^[#*-]+\s*/, '')
        .replace(/[^a-zA-Z0-9\s&'.,-]/g, '')
        .trim();
      if (!merchantName) {
        merchantName = clean;
      }
      // If a subsequent line has a specific consumer retail brand (e.g. SMART SUPERSTORE, CROMA, COFFEE, PHARMACY), prefer it
      if (/(?:smart|superstore|mart|cafe|coffee|pharmacy|bazaar|croma|zara|hospital|clinic)/i.test(clean)) {
        merchantName = clean;
        break;
      }
    }
  }

  if (!merchantName) {
    merchantName = cleanLines[0]?.replace(/[^a-zA-Z0-9\s&'.,-]/g, '').trim() || 'Store / Merchant';
  }

  // 2. Identify Date & Time
  let transactionDate = new Date().toISOString().slice(0, 10);
  let purchaseDateConfidence = 0.5;
  let purchaseTime: string | undefined;

  const isoMatch = rawText.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  const dmyMatch = rawText.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  const dMonYMatch = rawText.match(
    /\b(0?[1-9]|[12]\d|3[01])[-/\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s](20\d{2})\b/i
  );

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  if (isoMatch) {
    transactionDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    purchaseDateConfidence = 0.95;
  } else if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    transactionDate = `${y}-${m}-${d}`;
    purchaseDateConfidence = 0.95;
  } else if (dMonYMatch) {
    const d = dMonYMatch[1].padStart(2, '0');
    const mKey = dMonYMatch[2].toLowerCase().slice(0, 3);
    const m = monthMap[mKey] || '01';
    const y = dMonYMatch[3];
    transactionDate = `${y}-${m}-${d}`;
    purchaseDateConfidence = 0.95;
  }

  const timeMatch = rawText.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const ampm = timeMatch[4]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    purchaseTime = `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // 3. Detect Currency
  let currency = 'INR';
  if (/[$]/.test(rawText) && !/[₹]|Rs|INR/i.test(rawText)) currency = 'USD';
  else if (/[€]/.test(rawText)) currency = 'EUR';
  else if (/[£]/.test(rawText)) currency = 'GBP';

  // 4. Identify Invoice / Bill Number & Payment Method
  let invoiceNumber: string | undefined;
  const invMatch = rawText.match(
    /(?:tax\s*invoice|retail\s*invoice|invoice|bill|receipt|tax\s*inv\b|memo)\s*(?:no\.?|id)?\s*[:\-#]?\s*([A-Za-z0-9\-_/]+)/i
  );
  if (invMatch && invMatch[1].length >= 3 && !/^(total|date|cash)/i.test(invMatch[1])) {
    invoiceNumber = invMatch[1].trim();
  }

  let paymentMethod: string | undefined;
  if (/upi|gpay|google\s*pay|phonepe|paytm/i.test(rawText)) {
    paymentMethod = 'UPI';
  } else if (/credit\s*card|debit\s*card|visa|mastercard|amex|rupay/i.test(rawText)) {
    paymentMethod = 'Card';
  } else if (/cash\s*tendered|tendered\s*cash|paid\s*by\s*cash|cash/i.test(rawText)) {
    paymentMethod = 'Cash';
  } else if (/net\s*banking/i.test(rawText)) {
    paymentMethod = 'Net Banking';
  }

  // 5. Monetary Value Extraction (Subtotal, Discount, Tax, Cash Tendered, Change, Grand Total)
  let extractedSubtotal: number | undefined;
  let extractedDiscount: number | undefined;
  let extractedTax: number | undefined;
  let explicitGrandTotal: number | undefined;
  let tenderedCash: number | undefined;
  let changeReturned: number | undefined;

  const items: ReceiptItemInput[] = [];

  for (const line of cleanLines) {
    // Grand Total / Net Payable
    if (
      /(?:grand\s*total|net\s*payable|net\s*amount\s*payable|amount\s*due|amount\s*paid|total\s*bill|total\s*amount|^total\b)/i.test(
        line
      ) &&
      !/items?|qty|discount|savings/i.test(line)
    ) {
      const val = parseIndianCurrency(line);
      if (val !== null && val > 0) {
        explicitGrandTotal = val;
      }
      continue;
    }

    // Subtotal: prioritize explicit Sub Total / Gross Total over Taxable Value
    if (/(?:sub\s*total|gross\s*total)/i.test(line)) {
      const val = parseIndianCurrency(line);
      if (val !== null && val > 0) {
        extractedSubtotal = val;
      }
      continue;
    } else if (/(?:taxable\s*amount|taxable\s*value)/i.test(line)) {
      if (extractedSubtotal === undefined) {
        const val = parseIndianCurrency(line);
        if (val !== null && val > 0) {
          extractedSubtotal = val;
        }
      }
      continue;
    }

    // Discount / Savings
    if (/(?:discount|cashback|savings|you\s*saved|offer)/i.test(line)) {
      const val = parseIndianCurrency(line);
      if (val !== null && val > 0) {
        extractedDiscount = val;
      }
      continue;
    }

    // Taxes (CGST, SGST, IGST, VAT, Sales Tax) - exclude invoice titles, taxable amounts, and GSTIN numbers
    if (
      /(?:cgst|sgst|igst|\bgst\b|vat|sales\s*tax|\btax\b)/i.test(line) &&
      !/(?:tax\s*invoice|tax\s*inv|tax\s*no|tax\s*id|tax\s*#|taxable|tax\s*reg|gstin)/i.test(
        line
      )
    ) {
      const val = parseIndianCurrency(line);
      if (val !== null && val > 0) {
        extractedTax = roundMoney((extractedTax || 0) + val);
      }
      continue;
    }

    // Tendered Cash
    if (/(?:tendered\s*cash|cash\s*tendered|cash\s*paid)/i.test(line)) {
      const val = parseIndianCurrency(line);
      if (val !== null && val > 0) {
        tenderedCash = val;
      }
      continue;
    }

    // Change Returned
    if (/(?:change\s*returned|change\s*due|change\b)/i.test(line)) {
      const val = parseIndianCurrency(line);
      if (val !== null && val >= 0) {
        changeReturned = val;
      }
      continue;
    }

    // Item line pattern: e.g. "Amul Milk 1L  2 x 54.00  108.00" or "Artisan Bread  145.00"
    const itemMatch = line.match(
      /^([A-Za-z0-9][A-Za-z0-9\s&/().,'-]{2,40}?)\s+(?:(\d+)\s*[xX*]\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s+)?(?:[₹$€£]|Rs\.?)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{2}))$/
    );

    if (itemMatch) {
      const rawName = itemMatch[1].trim();
      const isHeaderWord =
        /^(subtotal|total|cash|change|card|visa|mastercard|discount|tip|balance|tax|gst|round|net|paid|tendered)/i.test(
          rawName
        );
      if (!isHeaderWord) {
        const qty = itemMatch[2] ? parseFloat(itemMatch[2]) : 1;
        const totalPrice = parseIndianCurrency(itemMatch[4]) || 0;
        const unitPrice = itemMatch[3]
          ? parseIndianCurrency(itemMatch[3]) || roundMoney(totalPrice / (qty || 1))
          : roundMoney(totalPrice / (qty || 1));

        if (totalPrice > 0 && totalPrice < 2000000) {
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

  // 6. Resolve Final Payable Amount
  let finalTotal = 0;
  let totalConfidence = 0.5;
  const warnings: string[] = [];

  if (explicitGrandTotal !== undefined && explicitGrandTotal > 0) {
    finalTotal = explicitGrandTotal;
    totalConfidence = 0.95;
  } else if (tenderedCash !== undefined && changeReturned !== undefined) {
    finalTotal = roundMoney(tenderedCash - changeReturned);
    totalConfidence = 0.9;
  } else if (extractedSubtotal !== undefined) {
    finalTotal = roundMoney(
      extractedSubtotal - (extractedDiscount || 0) + (extractedTax || 0)
    );
    totalConfidence = 0.8;
  } else if (items.length > 0) {
    const itemsSum = items.reduce((s, i) => s + i.totalPrice, 0);
    finalTotal = roundMoney(itemsSum + (extractedTax || 0));
    totalConfidence = 0.75;
    warnings.push('Receipt total line was missing or ambiguous; calculated total from item prices.');
  }

  // Arithmetic Verification
  let needsReview = false;
  if (extractedSubtotal && finalTotal > 0) {
    const expected = roundMoney(
      extractedSubtotal - (extractedDiscount || 0) + (extractedTax || 0)
    );
    const diff = Math.abs(expected - finalTotal);
    // Allow slight discrepancy for round-off (<= 2.0 INR)
    if (diff > 2.0) {
      needsReview = true;
      warnings.push(
        `Discrepancy detected: Subtotal (${extractedSubtotal}) minus discount plus tax equals ${expected}, but extracted total is ${finalTotal}. Please verify.`
      );
      totalConfidence = Math.max(0.4, totalConfidence - 0.3);
    }
  }

  if (finalTotal <= 0) {
    needsReview = true;
    totalConfidence = 0.1;
    warnings.push('Could not detect a clear final total amount. Please verify the amount.');
  }

  const { category, reasoning } = categorizeExpenseByMerchantAndItems(
    merchantName,
    items,
    rawText
  );

  return {
    isValidReceipt: finalTotal > 0 || items.length > 0,
    qualityWarning: warnings.length > 0 ? warnings[0] : undefined,
    receiptHash,
    merchantName,
    transactionDate,
    purchaseTime,
    currency,
    subtotal: extractedSubtotal,
    discount: extractedDiscount,
    taxAmount: extractedTax,
    totalAmount: finalTotal,
    paymentMethod,
    invoiceNumber,
    items,
    suggestedCategory: category,
    categoryReasoning: reasoning,
    rawText,
    extractionSource: 'ocr-engine',
    confidence: {
      merchantName: merchantName ? 0.9 : 0.3,
      totalAmount: totalConfidence,
      purchaseDate: purchaseDateConfidence,
    },
    needsReview: needsReview || totalConfidence < 0.7,
    warnings,
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

