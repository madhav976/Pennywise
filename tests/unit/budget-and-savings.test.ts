import { describe, expect, it } from 'vitest';
import { BudgetService } from '@/modules/finance/services/budget-service';
import { SavingsService } from '@/modules/finance/services/savings-service';
import { TransactionDTO } from '@/types/finance';

function makeTx(overrides: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: overrides.id ?? 'tx-1',
    userId: 'user-1',
    accountId: overrides.accountId ?? 'acc-1',
    categoryId: overrides.categoryId !== undefined ? overrides.categoryId : 'cat-food',
    transactionType: overrides.transactionType ?? 'expense',
    amount: overrides.amount ?? '100.0000',
    currency: overrides.currency ?? 'USD',
    paymentMethod: 'credit_card',
    transactionDate: overrides.transactionDate ?? '2026-11-10',
    description: overrides.description ?? 'Test Tx',
    merchantName: overrides.merchantName ?? 'Merchant',
    notes: null,
    referenceNumber: null,
    transferPairId: overrides.transferPairId ?? null,
    transferRole: overrides.transferRole ?? null,
    recurringTransactionId: null,
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe('BudgetService – Automatic Expense Tracking & Threshold Alerts', () => {
  it('resolves alert levels accurately across <50%, 50-79%, 80-99%, and >=100%', () => {
    expect(BudgetService.resolveAlertLevel(0)).toBe('normal');
    expect(BudgetService.resolveAlertLevel(49.9)).toBe('normal');
    expect(BudgetService.resolveAlertLevel(50)).toBe('monitor');
    expect(BudgetService.resolveAlertLevel(79.9)).toBe('monitor');
    expect(BudgetService.resolveAlertLevel(80)).toBe('warning');
    expect(BudgetService.resolveAlertLevel(99.9)).toBe('warning');
    expect(BudgetService.resolveAlertLevel(100)).toBe('exceeded');
    expect(BudgetService.resolveAlertLevel(145)).toBe('exceeded');
  });

  it('triggers non-duplicated threshold notifications when utilization crosses 50%, 80%, or 100%', () => {
    const first = BudgetService.resolveTriggeredThresholds(82, []);
    expect(first.newlyTriggered).toEqual([50, 80]);
    expect(first.updatedThresholds).toEqual([50, 80]);

    // Subsequent evaluation at 85% should NOT re-trigger 50 or 80
    const second = BudgetService.resolveTriggeredThresholds(85, first.updatedThresholds);
    expect(second.newlyTriggered).toEqual([]);

    // Crossing 100% triggers only 100
    const third = BudgetService.resolveTriggeredThresholds(105, second.updatedThresholds);
    expect(third.newlyTriggered).toEqual([100]);
    expect(third.updatedThresholds).toEqual([50, 80, 100]);
  });

  it('computes budget utilization strictly from non-deleted expense transactions in the date window', () => {
    const txs: TransactionDTO[] = [
      makeTx({ id: '1', categoryId: 'cat-food', transactionType: 'expense', amount: '120.5000', transactionDate: '2026-11-05' }),
      makeTx({ id: '2', categoryId: 'cat-food', transactionType: 'expense', amount: '79.5000', transactionDate: '2026-11-15' }),
      // Income must be ignored
      makeTx({ id: '3', categoryId: 'cat-food', transactionType: 'income', amount: '500.0000', transactionDate: '2026-11-10' }),
      // Transfers must be ignored
      makeTx({ id: '4', categoryId: null, transactionType: 'transfer', amount: '300.0000', transactionDate: '2026-11-12' }),
      // Soft-deleted expense must be ignored
      makeTx({ id: '5', categoryId: 'cat-food', transactionType: 'expense', amount: '90.0000', transactionDate: '2026-11-12', deletedAt: '2026-11-13T00:00:00Z' }),
      // Different category must be ignored for category-specific budget
      makeTx({ id: '6', categoryId: 'cat-travel', transactionType: 'expense', amount: '400.0000', transactionDate: '2026-11-12' }),
    ];

    const categoryResult = BudgetService.computeBudgetUtilization(
      {
        id: 'budget-1',
        userId: 'user-1',
        name: 'Food Budget',
        categoryId: 'cat-food',
        categoryName: 'Food & Dining',
        amount: '250.0000',
        currency: 'USD',
        period: 'monthly',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        description: null,
        isActive: true,
        alertThresholdsTriggered: [],
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      txs
    );

    expect(categoryResult.spentAmount).toBe('200.0000');
    expect(categoryResult.remainingAmount).toBe('50.0000');
    expect(categoryResult.utilizationPercentage).toBe(80);
    expect(categoryResult.alertLevel).toBe('warning');

    // Overall budget (categoryId = null) includes both cat-food ($200) and cat-travel ($400) = $600
    const overallResult = BudgetService.computeBudgetUtilization(
      {
        id: 'budget-2',
        userId: 'user-1',
        name: 'Overall Cap',
        categoryId: null,
        categoryName: 'Overall Spending',
        amount: '500.0000',
        currency: 'USD',
        period: 'monthly',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        description: null,
        isActive: true,
        alertThresholdsTriggered: [],
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      txs
    );
    expect(overallResult.spentAmount).toBe('600.0000');
    expect(overallResult.remainingAmount).toBe('-100.0000');
    expect(overallResult.utilizationPercentage).toBe(120);
    expect(overallResult.alertLevel).toBe('exceeded');
  });
});

describe('SavingsService – Goal Progress & Estimated Monthly Contribution', () => {
  it('calculates progress percentage, remaining amount, and estimated monthly contribution', () => {
    const metrics = SavingsService.computeGoalMetrics(
      {
        targetAmount: '10000.0000',
        currentAmount: '4000.0000',
        targetDate: '2027-05-01',
        status: 'active',
      },
      new Date('2026-11-01T00:00:00Z')
    );

    expect(metrics.remainingAmount).toBe('6000.0000');
    expect(metrics.progressPercentage).toBe(40);
    expect(metrics.daysRemaining).toBe(182);
    // ~5.98 months remaining -> ~$1003.40/month
    expect(Number(metrics.estimatedMonthlyRequired)).toBeGreaterThan(950);
    expect(Number(metrics.estimatedMonthlyRequired)).toBeLessThan(1050);
  });

  it('requires zero monthly contribution when goal reaches 100% of target', () => {
    const metrics = SavingsService.computeGoalMetrics(
      {
        targetAmount: '5000.0000',
        currentAmount: '5000.0000',
        targetDate: '2027-05-01',
        status: 'completed',
      },
      new Date('2026-11-01T00:00:00Z')
    );

    expect(metrics.remainingAmount).toBe('0.0000');
    expect(metrics.progressPercentage).toBe(100);
    expect(metrics.estimatedMonthlyRequired).toBe('0.0000');
  });
});
