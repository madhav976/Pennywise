import { describe, expect, it } from 'vitest';
import { calculateDateRange } from '@/lib/dates';
import { Money } from '@/lib/money';

describe('Financial Summary & Date Periods', () => {
  describe('calculateDateRange', () => {
    it('calculates this_month boundaries correctly', () => {
      const range = calculateDateRange('this_month');
      expect(range.startDate.getUTCDate()).toBe(1);
      expect(range.startDate.getUTCHours()).toBe(0);
      expect(range.startDate.getUTCMinutes()).toBe(0);
      expect(range.endDate.getUTCHours()).toBe(23);
      expect(range.endDate.getUTCMinutes()).toBe(59);
    });

    it('calculates this_year boundaries from Jan 1 to Dec 31', () => {
      const range = calculateDateRange('this_year');
      expect(range.startDate.getUTCMonth()).toBe(0); // Jan
      expect(range.startDate.getUTCDate()).toBe(1);
      expect(range.endDate.getUTCMonth()).toBe(11); // Dec
      expect(range.endDate.getUTCDate()).toBe(31);
    });

    it('calculates custom range properly', () => {
      const start = '2026-06-01T00:00:00.000Z';
      const end = '2026-06-30T23:59:59.999Z';
      const range = calculateDateRange('custom', start, end);
      expect(range.startDateIso).toBe(start);
      expect(range.endDateIso).toBe(end);
    });

    it('throws when custom start date is after end date', () => {
      const start = '2026-07-01T00:00:00.000Z';
      const end = '2026-06-01T00:00:00.000Z';
      expect(() => calculateDateRange('custom', start, end)).toThrowError(
        'Custom start date cannot be after end date'
      );
    });
  });

  describe('Net Worth & Metric Consistency', () => {
    it('calculates Net Worth = Total Assets - Total Liabilities', () => {
      // User has:
      // Checking: $4,500
      // Savings: $12,000
      // Cash: $300
      // Credit Card Debt: $1,250
      // Car Loan Debt: $8,000
      const checking = Money.from('4500.0000');
      const savings = Money.from('12000.0000');
      const cash = Money.from('300.0000');

      const creditCardDebt = Money.from('1250.0000');
      const loanDebt = Money.from('8000.0000');

      const totalAssets = checking.add(savings).add(cash);
      const totalLiabilities = creditCardDebt.add(loanDebt);
      const netWorth = totalAssets.subtract(totalLiabilities);

      expect(totalAssets.toDbString()).toBe('16800.0000');
      expect(totalLiabilities.toDbString()).toBe('9250.0000');
      expect(netWorth.toDbString()).toBe('7550.0000');
    });

    it('calculates category percentage of total expense correctly', () => {
      const totalExpense = Money.from('2000.0000');
      const foodExpense = Money.from('500.0000');
      const rentExpense = Money.from('1200.0000');
      const otherExpense = Money.from('300.0000');

      const foodPct = foodExpense.divide(totalExpense).multiply(100).toNumber();
      const rentPct = rentExpense.divide(totalExpense).multiply(100).toNumber();
      const otherPct = otherExpense.divide(totalExpense).multiply(100).toNumber();

      expect(foodPct).toBe(25);
      expect(rentPct).toBe(60);
      expect(otherPct).toBe(15);
      expect(foodPct + rentPct + otherPct).toBe(100);
    });
  });
});

