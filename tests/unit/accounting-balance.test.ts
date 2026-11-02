import { describe, expect, it } from 'vitest';
import { AccountService } from '@/modules/finance/services/account-service';

describe('Account Accounting Logic & Balance Formulas', () => {
  describe('Asset Accounts (Checking, Savings, Cash)', () => {
    const initialBalance = '1000.0000';
    const accountType = 'checking';

    it('increases balance on income', () => {
      const result = AccountService.calculateBalanceDelta(
        initialBalance,
        accountType,
        'income',
        null,
        '250.0000',
        'apply'
      );
      expect(result).toBe('1250.0000');
    });

    it('decreases balance on expense', () => {
      const result = AccountService.calculateBalanceDelta(
        initialBalance,
        accountType,
        'expense',
        null,
        '150.5000',
        'apply'
      );
      expect(result).toBe('849.5000');
    });

    it('decreases balance on outgoing transfer (source leg)', () => {
      const result = AccountService.calculateBalanceDelta(
        initialBalance,
        accountType,
        'transfer',
        'source',
        '300.0000',
        'apply'
      );
      expect(result).toBe('700.0000');
    });

    it('increases balance on incoming transfer (destination leg)', () => {
      const result = AccountService.calculateBalanceDelta(
        initialBalance,
        accountType,
        'transfer',
        'destination',
        '300.0000',
        'apply'
      );
      expect(result).toBe('1300.0000');
    });

    it('correctly reverses an applied expense when transaction is deleted', () => {
      // Balance after expense of 100 was 900
      const afterExpense = '900.0000';
      const reversed = AccountService.calculateBalanceDelta(
        afterExpense,
        accountType,
        'expense',
        null,
        '100.0000',
        'reverse'
      );
      expect(reversed).toBe('1000.0000');
    });
  });

  describe('Liability Accounts (Credit Card / Loan - Debt Convention)', () => {
    // Current balance represents outstanding debt owed
    const initialDebt = '500.0000';
    const accountType = 'credit_card';

    it('increases debt on credit card expense (purchase)', () => {
      const result = AccountService.calculateBalanceDelta(
        initialDebt,
        accountType,
        'expense',
        null,
        '120.0000',
        'apply'
      );
      // Debt goes from 500 to 620
      expect(result).toBe('620.0000');
    });

    it('decreases debt on bill payment (incoming transfer from checking)', () => {
      const result = AccountService.calculateBalanceDelta(
        initialDebt,
        accountType,
        'transfer',
        'destination',
        '200.0000',
        'apply'
      );
      // Debt goes from 500 to 300
      expect(result).toBe('300.0000');
    });

    it('decreases debt on refund (income to credit card)', () => {
      const result = AccountService.calculateBalanceDelta(
        initialDebt,
        accountType,
        'income',
        null,
        '50.0000',
        'apply'
      );
      // Debt goes from 500 to 450
      expect(result).toBe('450.0000');
    });

    it('reverses an expense correctly upon deletion', () => {
      const debtAfterPurchase = '620.0000';
      const reversed = AccountService.calculateBalanceDelta(
        debtAfterPurchase,
        accountType,
        'expense',
        null,
        '120.0000',
        'reverse'
      );
      expect(reversed).toBe('500.0000');
    });
  });
});

