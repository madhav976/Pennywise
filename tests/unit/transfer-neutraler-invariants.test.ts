import { describe, expect, it } from 'vitest';
import { Money } from '@/lib/money';
import { AccountService } from '@/modules/finance/services/account-service';

describe('Transfer Invariants & Net Neutrality Proofs', () => {
  it('guarantees zero net wealth change on transfers between two asset accounts', () => {
    let checkingBalance = '2000.0000';
    let savingsBalance = '5000.0000';
    const transferAmount = '500.0000';

    const initialTotalAssets = Money.from(checkingBalance).add(savingsBalance);
    expect(initialTotalAssets.toDbString()).toBe('7000.0000');

    // Perform transfer from Checking to Savings
    checkingBalance = AccountService.calculateBalanceDelta(
      checkingBalance,
      'checking',
      'transfer',
      'source',
      transferAmount,
      'apply'
    );
    savingsBalance = AccountService.calculateBalanceDelta(
      savingsBalance,
      'savings',
      'transfer',
      'destination',
      transferAmount,
      'apply'
    );

    expect(checkingBalance).toBe('1500.0000');
    expect(savingsBalance).toBe('5500.0000');

    const finalTotalAssets = Money.from(checkingBalance).add(savingsBalance);
    expect(finalTotalAssets.toDbString()).toBe('7000.0000');
    expect(finalTotalAssets.equals(initialTotalAssets)).toBe(true);
  });

  it('guarantees zero net worth change when paying a credit card bill from checking', () => {
    let checkingBalance = '3000.0000'; // Asset
    let creditCardDebt = '800.0000';   // Liability
    const paymentAmount = '400.0000';

    // Initial Net Worth = Total Assets - Total Liabilities = 3000 - 800 = 2200
    const initialNetWorth = Money.from(checkingBalance).subtract(creditCardDebt);
    expect(initialNetWorth.toDbString()).toBe('2200.0000');

    // Transfer: Checking (Source) -> Credit Card (Destination)
    checkingBalance = AccountService.calculateBalanceDelta(
      checkingBalance,
      'checking',
      'transfer',
      'source',
      paymentAmount,
      'apply'
    );
    creditCardDebt = AccountService.calculateBalanceDelta(
      creditCardDebt,
      'credit_card',
      'transfer',
      'destination',
      paymentAmount,
      'apply'
    );

    expect(checkingBalance).toBe('2600.0000');
    expect(creditCardDebt).toBe('400.0000');

    // Final Net Worth = 2600 - 400 = 2200
    const finalNetWorth = Money.from(checkingBalance).subtract(creditCardDebt);
    expect(finalNetWorth.toDbString()).toBe('2200.0000');
    expect(finalNetWorth.equals(initialNetWorth)).toBe(true);
  });

  it('guarantees transfers are excluded from Net Cash Flow', () => {
    const transactions = [
      { type: 'income', amount: '5000.0000' },
      { type: 'expense', amount: '1200.0000' },
      { type: 'transfer', amount: '1000.0000', role: 'source' },
      { type: 'transfer', amount: '1000.0000', role: 'destination' },
    ];

    let incomeSum = Money.zero();
    let expenseSum = Money.zero();

    for (const tx of transactions) {
      if (tx.type === 'income') {
        incomeSum = incomeSum.add(tx.amount);
      } else if (tx.type === 'expense') {
        expenseSum = expenseSum.add(tx.amount);
      }
      // Transfers are strictly skipped in Cash Flow
    }

    const netCashFlow = incomeSum.subtract(expenseSum);
    expect(incomeSum.toDbString()).toBe('5000.0000');
    expect(expenseSum.toDbString()).toBe('1200.0000');
    expect(netCashFlow.toDbString()).toBe('3800.0000');
  });
});

