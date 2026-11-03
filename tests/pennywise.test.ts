import { describe, expect, it } from 'vitest';
import {
  advanceDateByFrequency,
  calculateAccountBalance,
  calculateGoalMetrics,
  canSafelyDeleteAccount,
  computeMonthlyAnalytics,
  getPeriodKeyForDate,
  synchronizeBalances,
} from '@/lib/money';
import {
  categorizeExpenseByMerchantAndItems,
  parseRawReceiptText,
  SAMPLE_RECEIPT_TEXTS,
} from '@/lib/receipt-intelligence';
import {
  buildCameraConstraints,
  classifyCameraError,
  stopMediaStreamTracks,
  supportsCameraTorch,
} from '@/lib/camera-utils';
import { Account, GoalContribution, SavingsGoal, Transaction } from '@/types/pennywise';

describe('Pennywise Financial Engine & AI Receipt Categorization', () => {
  it('enforces Opening Balance + Income - Expenses - Goal Contributions = Current Balance without double-counting expenses', () => {
    const accounts: Account[] = [
      {
        id: 'acc-1',
        userId: 'usr-1',
        name: 'Salary Account',
        accountType: 'salary',
        openingBalance: 50000,
        currentBalance: 50000,
        icon: 'Landmark',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        userId: 'usr-1',
        accountId: 'acc-1',
        title: 'Bonus Credit',
        amount: 10000,
        transactionType: 'income',
        category: 'Salary',
        transactionDate: '2026-11-02',
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z',
      },
      {
        id: 'tx-2',
        userId: 'usr-1',
        accountId: 'acc-1',
        title: 'FreshMart Groceries',
        amount: 2500.5,
        transactionType: 'expense',
        category: 'Groceries',
        transactionDate: '2026-11-03',
        createdAt: '2026-11-03T00:00:00Z',
        updatedAt: '2026-11-03T00:00:00Z',
      },
    ];

    const goals: SavingsGoal[] = [
      {
        id: 'goal-1',
        userId: 'usr-1',
        name: 'iPhone',
        targetAmount: 80000,
        savedAmount: 0,
        icon: 'smartphone',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    const contributions: GoalContribution[] = [
      {
        id: 'c-1',
        userId: 'usr-1',
        goalId: 'goal-1',
        sourceAccountId: 'acc-1',
        amount: 15000,
        contributionDate: '2026-11-03',
        createdAt: '2026-11-03T00:00:00Z',
      },
    ];

    const synced = synchronizeBalances(accounts, transactions, goals, contributions);
    // 50,000 + 10,000 - 2,500.50 - 15,000 = 42,499.50
    expect(synced.accounts[0].currentBalance).toBe(42499.5);
    expect(synced.goals[0].savedAmount).toBe(15000);

    // Verify savings contribution is NOT double-counted in Monthly Expenses
    const analytics = computeMonthlyAnalytics(
      '2026-11',
      synced.accounts,
      transactions,
      synced.goals
    );
    expect(analytics.totalExpenses).toBe(2500.5);
    expect(analytics.totalIncome).toBe(10000);
    expect(analytics.totalAvailableBalance).toBe(42499.5);
    expect(analytics.totalSavedInGoals).toBe(15000);
  });

  it('prevents deleting accounts that have existing transactions or savings contributions', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        userId: 'usr-1',
        accountId: 'acc-busy',
        title: 'Coffee',
        amount: 250,
        transactionType: 'expense',
        category: 'Food & Dining',
        transactionDate: '2026-11-03',
        createdAt: '2026-11-03T00:00:00Z',
        updatedAt: '2026-11-03T00:00:00Z',
      },
    ];

    expect(canSafelyDeleteAccount('acc-busy', txs, []).allowed).toBe(false);
    expect(canSafelyDeleteAccount('acc-clean', txs, []).allowed).toBe(true);
  });

  it('categorizes receipts using purchased items rather than blindly relying on merchant name', () => {
    // Merchant is a general retail store ("TARGET SUPERCENTER"), but items are pharmacy/medical
    const result = categorizeExpenseByMerchantAndItems('TARGET SUPERCENTER', [
      { name: 'Paracetamol 500mg Strip', quantity: 2, unitPrice: 45, totalPrice: 90 },
      { name: 'Vitamin D3 Supplements', quantity: 1, unitPrice: 420, totalPrice: 420 },
      { name: 'Digital Thermometer', quantity: 1, unitPrice: 350, totalPrice: 350 },
    ]);

    expect(result.category).toBe('Healthcare');
    expect(result.reasoning.toLowerCase()).toContain('purchased items');
  });

  it('parses raw OCR receipt text into structured merchant, items, tax, and total', () => {
    const parsed = parseRawReceiptText(
      SAMPLE_RECEIPT_TEXTS.groceries.rawText,
      'hash-grocery-1'
    );
    expect(parsed.isValidReceipt).toBe(true);
    expect(parsed.merchantName).toContain('RELIANCE SMART');
    expect(parsed.totalAmount).toBe(1433.25);
    expect(parsed.taxAmount).toBe(68.25);
    expect(parsed.items.length).toBeGreaterThanOrEqual(4);
    expect(parsed.suggestedCategory).toBe('Groceries');
  });

  it('computes previous month comparison in both monetary and percentage terms', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-oct',
        userId: 'u1',
        accountId: 'a1',
        title: 'Oct Rent & Food',
        amount: 2000,
        transactionType: 'expense',
        category: 'Food & Dining',
        transactionDate: '2026-10-10',
        createdAt: '2026-10-10T00:00:00Z',
        updatedAt: '2026-10-10T00:00:00Z',
      },
      {
        id: 'tx-nov',
        userId: 'u1',
        accountId: 'a1',
        title: 'Nov Food',
        amount: 1500,
        transactionType: 'expense',
        category: 'Food & Dining',
        transactionDate: '2026-11-10',
        createdAt: '2026-11-10T00:00:00Z',
        updatedAt: '2026-11-10T00:00:00Z',
      },
    ];

    const summary = computeMonthlyAnalytics('2026-11', [], txs, []);
    expect(summary.totalExpenses).toBe(1500);
    expect(summary.previousMonthExpenses).toBe(2000);
    expect(summary.expenseDifferenceAmount).toBe(-500);
    expect(summary.expenseDifferencePercent).toBe(-25);
  });

  it('calculates goal metrics and deterministic recurring period keys', () => {
    const metrics = calculateGoalMetrics({
      id: 'g1',
      userId: 'u1',
      name: 'iPhone',
      targetAmount: 80000,
      savedAmount: 20000,
      icon: 'smartphone',
      createdAt: '',
      updatedAt: '',
    });
    expect(metrics.remainingAmount).toBe(60000);
    expect(metrics.percentage).toBe(25);
    expect(advanceDateByFrequency('2026-11-03', 'monthly')).toBe('2026-12-03');
    expect(getPeriodKeyForDate('2026-11-03', 'monthly')).toBe('monthly:2026-11');
  });

  it('builds rear-facing mobile camera constraints and safely stops all media stream tracks', () => {
    const rearConstraints = buildCameraConstraints('environment');
    expect(rearConstraints.audio).toBe(false);
    expect(rearConstraints.video).toEqual({
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    });

    const frontConstraints = buildCameraConstraints('user');
    expect(frontConstraints.video).toEqual({
      facingMode: { ideal: 'user' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    });

    // Mock media stream track stoppage
    let track1Stopped = false;
    let track2Stopped = false;
    const mockStream = {
      getTracks: () => [
        { stop: () => { track1Stopped = true; } },
        { stop: () => { track2Stopped = true; } },
      ],
    } as unknown as MediaStream;

    const count = stopMediaStreamTracks(mockStream);
    expect(count).toBe(2);
    expect(track1Stopped).toBe(true);
    expect(track2Stopped).toBe(true);
    expect(stopMediaStreamTracks(null)).toBe(0);
  });

  it('classifies browser camera permission errors and hardware conflicts accurately', () => {
    // 1. Permission Denied
    const permErr = classifyCameraError({ name: 'NotAllowedError', message: 'Permission denied' });
    expect(permErr.category).toBe('permission_denied');
    expect(permErr.title).toBe('Camera access is required to scan receipts.');
    expect(permErr.browserSettingsHint).toContain('Allow');

    // 2. No Camera Device Found
    const notFoundErr = classifyCameraError({ name: 'NotFoundError', message: 'No camera found' });
    expect(notFoundErr.category).toBe('device_not_found');
    expect(notFoundErr.message).toContain('No compatible camera was found');

    // 3. Camera in use by another app
    const inUseErr = classifyCameraError({ name: 'NotReadableError', message: 'Device in use' });
    expect(inUseErr.category).toBe('camera_in_use');
    expect(inUseErr.message).toContain('in use by another application');

    // 4. Insecure context / missing mediaDevices
    const unsupportedErr = classifyCameraError({ name: 'UnsupportedContextError' });
    expect(unsupportedErr.category).toBe('unsupported_context');
    expect(unsupportedErr.message).toContain('HTTPS or localhost');
  });
});

