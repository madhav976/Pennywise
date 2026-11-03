import { describe, expect, it } from 'vitest';
import {
  categorizeExpenseByMerchantAndItems,
  parseIndianCurrency,
  parseRawReceiptText,
} from '@/lib/receipt-intelligence';

describe('Pennywise Receipt Intelligence & Indian Financial OCR Parser', () => {
  it('accurately parses Indian currency notations with commas and currency prefixes', () => {
    expect(parseIndianCurrency('₹ 1,416.00')).toBe(1416.0);
    expect(parseIndianCurrency('Rs. 4,000')).toBe(4000.0);
    expect(parseIndianCurrency('INR 1,25,000.50')).toBe(125000.5);
    expect(parseIndianCurrency('4,000/-')).toBe(4000.0);
    expect(parseIndianCurrency('NET PAYABLE: ₹ 33,617.00')).toBe(33617.0);
    expect(parseIndianCurrency('Total: 689.00')).toBe(689.0);
    expect(parseIndianCurrency('GST (5%) 68.25')).toBe(68.25);
    expect(parseIndianCurrency('CGST @ 9% 2,564.01')).toBe(2564.01);
    expect(parseIndianCurrency('SPECIAL DISCOUNT (10%): 53.60')).toBe(53.6);
  });

  it('correctly resolves Net Payable total on grocery bill with Subtotal, Discount, GST and Round-off', () => {
    const rawGroceryBill = `RELIANCE RETAIL LIMITED
RELIANCE SMART SUPERSTORE - INDIRANAGAR
GSTIN: 29AABCR1234M1Z8
Tax Invoice #RS-90412
Date: 28/10/2026 Time: 18:42
Cashier: Ramesh K
--------------------------------
AMUL TAAZA MILK 1L      2 x 54.00    108.00
AASHIRVAAD ATTA 5KG     1 x 245.00   245.00
FORTUNE SUNFLOWER 1L    1 x 140.00   140.00
TATA SALT 1KG           1 x 28.00     28.00
HASS AVOCADO 2PK        1 x 180.00   180.00
--------------------------------
Sub Total                              701.00
Total Discount (Offers)                 45.00
Taxable Amount                         656.00
CGST 2.5%                               16.40
SGST 2.5%                               16.40
Round Off                               +0.20
--------------------------------
GRAND TOTAL                           ₹ 689.00
Amount Paid (UPI - GPay)              ₹ 689.00
Total Items: 5 | Total Qty: 6
You Saved ₹ 45.00 on this purchase!`;

    const extraction = parseRawReceiptText(rawGroceryBill, 'hash-reliance-1');

    expect(extraction.isValidReceipt).toBe(true);
    expect(extraction.merchantName).toContain('RELIANCE SMART');
    expect(extraction.totalAmount).toBe(689.0);
    expect(extraction.subtotal).toBe(701.0);
    expect(extraction.discount).toBe(45.0);
    expect(extraction.taxAmount).toBe(32.8);
    expect(extraction.transactionDate).toBe('2026-10-28');
    expect(extraction.purchaseTime).toBe('18:42');
    expect(extraction.paymentMethod).toBe('UPI');
    expect(extraction.invoiceNumber).toBe('RS-90412');
    expect(extraction.suggestedCategory).toBe('Groceries');
    expect(extraction.items.length).toBeGreaterThanOrEqual(4);
    expect(extraction.confidence?.totalAmount).toBeGreaterThanOrEqual(0.9);
  });

  it('never mistakes Cash Tendered for total when Change Returned is present on pharmacy bill', () => {
    const rawPharmacyBill = `APOLLO PHARMACY
UNIT OF APOLLO HOSPITALS ENTERPRISE LTD
DL NO: KA-B2-198421 / GSTIN: 29AAACA2019A1Z1
BILL NO: AP-551029  DATE: 01/11/2026 20:10
------------------------------------------------
DOLO 650 TABLET   DL401 12/27  2 x 30.00   60.00
AUGMENTIN 625MG   AG912 09/27  1 x 204.00 204.00
BECOSULES CAPS    BC118 04/28  1 x 52.00   52.00
THERMOMETER DIGI  TH002 01/30  1 x 220.00 220.00
------------------------------------------------
Gross Total:                            536.00
Special Discount:                        53.60
CGST 6%:                                 28.94
SGST 6%:                                 28.94
Round Off:                               -0.28
NET AMOUNT PAYABLE:                   ₹ 540.00
TENDERED CASH:                        ₹ 1,000.00
CHANGE RETURNED:                      ₹ 460.00`;

    const extraction = parseRawReceiptText(rawPharmacyBill, 'hash-apollo-1');

    expect(extraction.isValidReceipt).toBe(true);
    expect(extraction.merchantName).toContain('APOLLO PHARMACY');
    // Critical: Total must be 540, NOT 1000 tendered cash!
    expect(extraction.totalAmount).toBe(540.0);
    expect(extraction.totalAmount).not.toBe(1000.0);
    expect(extraction.discount).toBe(53.6);
    expect(extraction.taxAmount).toBe(57.88);
    expect(extraction.transactionDate).toBe('2026-11-01');
    expect(extraction.purchaseTime).toBe('20:10');
    expect(extraction.paymentMethod).toBe('Cash');
    expect(extraction.suggestedCategory).toBe('Healthcare');
    expect(extraction.items.length).toBeGreaterThanOrEqual(3);
  });

  it('handles high-value electronics GST invoice with multiple thousands, discounts and warranty', () => {
    const rawElectronicsBill = `CROMA - INFINITI RETAIL LIMITED
STORE # 104, KORAMANGALA, BANGALORE
INVOICE NO: CR-BLR-2026-88419
DATE: 02-Nov-2026 14:15
CUSTOMER: MADHAV SAINI
-----------------------------------------------
SONY WH-1000XM5 BLACK     1 x 28990.00  28990.00
2 YR EXTENDED WARRANTY    1 x 2499.00    2499.00
-----------------------------------------------
Sub Total                              31489.00
Festive Cashback Discount               3000.00
Taxable Value                          28489.00
CGST 9%                                 2564.01
SGST 9%                                 2564.01
Round Off                                 -0.02
NET PAYABLE                          ₹ 33,617.00
-----------------------------------------------
PAID VIA HDFC CREDIT CARD: ₹ 33,617.00
AUTH CODE: 981244
THANK YOU FOR SHOPPING AT CROMA`;

    const extraction = parseRawReceiptText(rawElectronicsBill, 'hash-croma-1');

    expect(extraction.isValidReceipt).toBe(true);
    expect(extraction.merchantName).toContain('CROMA');
    expect(extraction.totalAmount).toBe(33617.0);
    expect(extraction.subtotal).toBe(31489.0);
    expect(extraction.discount).toBe(3000.0);
    expect(extraction.taxAmount).toBe(5128.02);
    expect(extraction.transactionDate).toBe('2026-11-02');
    expect(extraction.purchaseTime).toBe('14:15');
    expect(extraction.paymentMethod).toBe('Card');
    expect(extraction.invoiceNumber).toBe('CR-BLR-2026-88419');
    expect(extraction.suggestedCategory).toBe('Shopping');
    expect(extraction.items.length).toBe(2);
  });

  it('extracts cafe / restaurant receipt with CGST, SGST and UPI payment', () => {
    const rawCafeBill = `BLUE TOKAI COFFEE ROASTERS
Order #BT-4418
Date: 03/11/2026 Time: 16:20
--------------------------------
Iced Oat Milk Latte       1 x 290.00   290.00
Almond Croissant          1 x 230.00   230.00
Avocado Sourdough Toast   1 x 340.00   340.00
--------------------------------
Subtotal                               860.00
CGST 2.5%                               21.50
SGST 2.5%                               21.50
--------------------------------
GRAND TOTAL                           ₹ 903.00
PAID VIA UPI (PhonePe)                ₹ 903.00`;

    const extraction = parseRawReceiptText(rawCafeBill, 'hash-cafe-1');

    expect(extraction.isValidReceipt).toBe(true);
    expect(extraction.merchantName).toContain('BLUE TOKAI');
    expect(extraction.totalAmount).toBe(903.0);
    expect(extraction.subtotal).toBe(860.0);
    expect(extraction.taxAmount).toBe(43.0);
    expect(extraction.transactionDate).toBe('2026-11-03');
    expect(extraction.purchaseTime).toBe('16:20');
    expect(extraction.paymentMethod).toBe('UPI');
    expect(extraction.suggestedCategory).toBe('Food & Dining');
    expect(extraction.items.length).toBe(3);
  });

  it('flags needsReview when receipt has major arithmetic discrepancy between items and total', () => {
    const rawDiscrepantBill = `STORE NAME
Date: 03/11/2026
--------------------------------
Subtotal: 1000.00
Tax: 50.00
Grand Total: 2500.00`;

    const extraction = parseRawReceiptText(rawDiscrepantBill, 'hash-disc-1');
    expect(extraction.needsReview).toBe(true);
    expect(extraction.warnings && extraction.warnings.length).toBeGreaterThan(0);
  });

  it('handles blurry or empty receipt text by returning clear unverified state without guessing', () => {
    const extraction = parseRawReceiptText('', 'hash-empty');
    expect(extraction.isValidReceipt).toBe(false);
    expect(extraction.totalAmount).toBe(0);
    expect(extraction.needsReview).toBe(true);
    expect(extraction.confidence?.totalAmount).toBeLessThan(0.5);
  });
});
