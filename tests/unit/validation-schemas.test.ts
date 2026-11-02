import { describe, expect, it } from 'vitest';
import {
  createAccountSchema,
} from '@/modules/finance/validation/account-schemas';
import {
  createRecurringSchema,
} from '@/modules/finance/validation/recurring-schemas';
import {
  createTransactionSchema,
  createTransferSchema,
} from '@/modules/finance/validation/transaction-schemas';

describe('Validation Schemas & Constraint Invariants', () => {
  describe('createTransactionSchema', () => {
    it('accepts valid income payload', () => {
      const valid = {
        accountId: '11111111-1111-4111-a111-111111111111',
        categoryId: '22222222-2222-4222-a222-222222222222',
        transactionType: 'income',
        amount: '1500.50',
        currency: 'USD',
        description: 'Monthly Salary',
        transactionDate: '2026-11-01T10:00:00.000Z',
      };
      const res = createTransactionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects zero or negative amounts', () => {
      const zeroAmount = {
        accountId: '11111111-1111-4111-a111-111111111111',
        categoryId: '22222222-2222-4222-a222-222222222222',
        transactionType: 'expense',
        amount: '0.00',
        description: 'Free coffee',
        transactionDate: '2026-11-01T10:00:00.000Z',
      };
      const res = createTransactionSchema.safeParse(zeroAmount);
      expect(res.success).toBe(false);

      const negativeAmount = { ...zeroAmount, amount: '-50.00' };
      const resNeg = createTransactionSchema.safeParse(negativeAmount);
      expect(resNeg.success).toBe(false);
    });

    it('rejects invalid currency format', () => {
      const invalidCurrency = {
        accountId: '11111111-1111-4111-a111-111111111111',
        categoryId: '22222222-2222-4222-a222-222222222222',
        transactionType: 'expense',
        amount: '50.00',
        currency: 'US_DOLLARS',
        description: 'Dinner',
        transactionDate: '2026-11-01T10:00:00.000Z',
      };
      const res = createTransactionSchema.safeParse(invalidCurrency);
      expect(res.success).toBe(false);
    });
  });

  describe('createTransferSchema', () => {
    it('rejects transfers where source and destination accounts are identical', () => {
      const sameAccount = {
        sourceAccountId: '11111111-1111-4111-a111-111111111111',
        destinationAccountId: '11111111-1111-4111-a111-111111111111',
        amount: '100.00',
        description: 'Internal transfer',
        transactionDate: '2026-11-01T10:00:00.000Z',
      };
      const res = createTransferSchema.safeParse(sameAccount);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('must be distinct');
      }
    });

    it('accepts transfers with distinct accounts', () => {
      const distinct = {
        sourceAccountId: '11111111-1111-4111-a111-111111111111',
        destinationAccountId: '22222222-2222-4222-a222-222222222222',
        amount: '100.00',
        description: 'Move funds to savings',
        transactionDate: '2026-11-01T10:00:00.000Z',
      };
      const res = createTransferSchema.safeParse(distinct);
      expect(res.success).toBe(true);
    });
  });

  describe('createRecurringSchema', () => {
    it('rejects when endDate is prior to startDate', () => {
      const invalidDates = {
        accountId: '11111111-1111-4111-a111-111111111111',
        categoryId: '22222222-2222-4222-a222-222222222222',
        transactionType: 'expense',
        amount: '50.00',
        description: 'Gym Subscription',
        frequency: 'monthly',
        intervalCount: 1,
        startDate: '2026-11-01',
        endDate: '2026-10-01', // Before start
      };
      const res = createRecurringSchema.safeParse(invalidDates);
      expect(res.success).toBe(false);
    });
  });

  describe('createAccountSchema', () => {
    it('requires valid account type', () => {
      const invalid = {
        accountName: 'Crypto Vault',
        accountType: 'unsupported_type',
        currency: 'USD',
      };
      const res = createAccountSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });
});

