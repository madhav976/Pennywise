import Decimal from 'decimal.js';
import {
  Account,
  CategoryBreakdownItem,
  DailySpendingPoint,
  EXPENSE_CATEGORIES,
  ExpenseCategoryName,
  GoalContribution,
  MonthlyAnalyticsSummary,
  RecurringFrequency,
  SavingsGoal,
  Transaction,
} from '@/types/pennywise';
import { getCategoryMeta } from '@/lib/categories';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  try {
    const d = new Decimal(value);
    return d.isNaN() || !d.isFinite() ? new Decimal(0) : d;
  } catch {
    return new Decimal(0);
  }
}

export function roundMoney(value: number | string | Decimal): number {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function addMoney(a: number | string, b: number | string): number {
  return roundMoney(toDecimal(a).plus(toDecimal(b)));
}

export function subMoney(a: number | string, b: number | string): number {
  return roundMoney(toDecimal(a).minus(toDecimal(b)));
}

export function mulMoney(a: number | string, b: number | string): number {
  return roundMoney(toDecimal(a).times(toDecimal(b)));
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'INR',
  options?: { compact?: boolean; showSign?: boolean }
): string {
  const num = roundMoney(amount ?? 0);
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : options?.showSign && num > 0 ? '+' : '';

  const symbolMap: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const symbol = symbolMap[currency] || '₹';

  if (options?.compact && absNum >= 100000) {
    if (currency === 'INR') {
      if (absNum >= 10000000) {
        return `${sign}${symbol}${(absNum / 10000000).toFixed(2)}Cr`;
      }
      return `${sign}${symbol}${(absNum / 100000).toFixed(2)}L`;
    }
    return `${sign}${symbol}${(absNum / 1000).toFixed(1)}k`;
  }

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: absNum % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(absNum);

  return `${sign}${symbol}${formatted}`;
}

/**
 * Core Account Balance Formula:
 * Opening Balance + Total Income - Total Expenses - Total Goal Contributions = Current Available Balance
 * Note: Savings goal contributions are tracked in GoalContribution and NOT as expense transactions,
 * preventing any double-counting in Monthly Expenses while accurately deducting from account balances.
 */
export function calculateAccountBalance(
  openingBalance: number,
  accountId: string,
  transactions: Transaction[],
  contributions: GoalContribution[]
): number {
  let balance = toDecimal(openingBalance);

  for (const tx of transactions) {
    if (tx.accountId !== accountId) continue;
    if (tx.transactionType === 'income') {
      balance = balance.plus(toDecimal(tx.amount));
    } else if (tx.transactionType === 'expense') {
      balance = balance.minus(toDecimal(tx.amount));
    }
  }

  for (const contrib of contributions) {
    if (contrib.sourceAccountId !== accountId) continue;
    balance = balance.minus(toDecimal(contrib.amount));
  }

  return roundMoney(balance);
}

/**
 * Recalculates all accounts and goals from the ground-truth ledger records.
 */
export function synchronizeBalances(
  accounts: Account[],
  transactions: Transaction[],
  goals: SavingsGoal[],
  contributions: GoalContribution[]
): { accounts: Account[]; goals: SavingsGoal[] } {
  const syncedAccounts = accounts.map((acc) => ({
    ...acc,
    openingBalance: roundMoney(acc.openingBalance),
    currentBalance: calculateAccountBalance(
      acc.openingBalance,
      acc.id,
      transactions,
      contributions
    ),
  }));

  const syncedGoals = goals.map((goal) => {
    let saved = new Decimal(0);
    for (const c of contributions) {
      if (c.goalId === goal.id) {
        saved = saved.plus(toDecimal(c.amount));
      }
    }
    return {
      ...goal,
      targetAmount: roundMoney(goal.targetAmount),
      savedAmount: roundMoney(saved),
    };
  });

  return { accounts: syncedAccounts, goals: syncedGoals };
}

export function calculateGoalMetrics(goal: SavingsGoal): {
  savedAmount: number;
  targetAmount: number;
  remainingAmount: number;
  percentage: number;
  isCompleted: boolean;
} {
  const saved = toDecimal(goal.savedAmount);
  const target = toDecimal(goal.targetAmount);
  const remaining = Decimal.max(0, target.minus(saved));
  const rawPct = target.gt(0) ? saved.dividedBy(target).times(100).toNumber() : 0;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPct * 10) / 10));

  return {
    savedAmount: roundMoney(saved),
    targetAmount: roundMoney(target),
    remainingAmount: roundMoney(remaining),
    percentage,
    isCompleted: saved.gte(target) && target.gt(0),
  };
}

export function canSafelyDeleteAccount(
  accountId: string,
  transactions: Transaction[],
  contributions: GoalContribution[]
): { allowed: boolean; reason?: string } {
  const txCount = transactions.filter((t) => t.accountId === accountId).length;
  const contribCount = contributions.filter((c) => c.sourceAccountId === accountId).length;

  if (txCount > 0 || contribCount > 0) {
    return {
      allowed: false,
      reason: `This account has ${txCount} transaction(s) and ${contribCount} savings contribution(s). Reassign or delete those records first to preserve financial integrity.`,
    };
  }
  return { allowed: true };
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string, short = false): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(Date.UTC(year, month, 1));
  return d.toLocaleDateString('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getDaysInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function computeMonthlyAnalytics(
  monthKey: string,
  accounts: Account[],
  transactions: Transaction[],
  goals: SavingsGoal[]
): MonthlyAnalyticsSummary {
  const prevMonthKey = getPreviousMonthKey(monthKey);
  const monthLabel = formatMonthLabel(monthKey);
  const previousMonthLabel = formatMonthLabel(prevMonthKey);

  let totalExpensesDec = new Decimal(0);
  let totalIncomeDec = new Decimal(0);
  let prevExpensesDec = new Decimal(0);

  const currentDayMap = new Map<number, Decimal>();
  const prevDayMap = new Map<number, Decimal>();
  const categoryMap = new Map<ExpenseCategoryName, { amount: Decimal; count: number }>();

  for (const tx of transactions) {
    const txMonth = tx.transactionDate.slice(0, 7);
    const txDay = parseInt(tx.transactionDate.slice(8, 10), 10);
    const amt = toDecimal(tx.amount);

    if (txMonth === monthKey) {
      if (tx.transactionType === 'expense') {
        totalExpensesDec = totalExpensesDec.plus(amt);
        currentDayMap.set(txDay, (currentDayMap.get(txDay) || new Decimal(0)).plus(amt));

        const catName = (EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategoryName)
          ? tx.category
          : 'Other') as ExpenseCategoryName;
        const existing = categoryMap.get(catName) || { amount: new Decimal(0), count: 0 };
        categoryMap.set(catName, {
          amount: existing.amount.plus(amt),
          count: existing.count + 1,
        });
      } else if (tx.transactionType === 'income') {
        totalIncomeDec = totalIncomeDec.plus(amt);
      }
    } else if (txMonth === prevMonthKey && tx.transactionType === 'expense') {
      prevExpensesDec = prevExpensesDec.plus(amt);
      prevDayMap.set(txDay, (prevDayMap.get(txDay) || new Decimal(0)).plus(amt));
    }
  }

  const daysCurrent = getDaysInMonth(monthKey);
  const daysPrev = getDaysInMonth(prevMonthKey);
  const maxDays = Math.max(daysCurrent, daysPrev);
  const shortMonthName = formatMonthLabel(monthKey, true).split(' ')[0];

  const dailySeries: DailySpendingPoint[] = [];
  let cumCurrent = new Decimal(0);
  let cumPrev = new Decimal(0);

  for (let day = 1; day <= maxDays; day++) {
    const dayCurr = day <= daysCurrent ? currentDayMap.get(day) || new Decimal(0) : new Decimal(0);
    const dayPrev = day <= daysPrev ? prevDayMap.get(day) || new Decimal(0) : new Decimal(0);
    cumCurrent = cumCurrent.plus(dayCurr);
    cumPrev = cumPrev.plus(dayPrev);

    if (day <= daysCurrent) {
      dailySeries.push({
        day,
        dateLabel: `${shortMonthName} ${day}`,
        fullDate: `${monthKey}-${String(day).padStart(2, '0')}`,
        currentMonthSpend: roundMoney(dayCurr),
        previousMonthSpend: roundMoney(dayPrev),
        cumulativeCurrent: roundMoney(cumCurrent),
        cumulativePrevious: roundMoney(cumPrev),
      });
    }
  }

  const totalExpenses = roundMoney(totalExpensesDec);
  const totalIncome = roundMoney(totalIncomeDec);
  const previousMonthExpenses = roundMoney(prevExpensesDec);
  const expenseDifferenceAmount = roundMoney(totalExpensesDec.minus(prevExpensesDec));
  const expenseDifferencePercent = prevExpensesDec.gt(0)
    ? Math.round(
        totalExpensesDec.minus(prevExpensesDec).dividedBy(prevExpensesDec).times(1000).toNumber()
      ) / 10
    : null;

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, data]) => {
      const amount = roundMoney(data.amount);
      const percentage = totalExpensesDec.gt(0)
        ? Math.round(data.amount.dividedBy(totalExpensesDec).times(1000).toNumber()) / 10
        : 0;
      const meta = getCategoryMeta(category);
      return {
        category,
        amount,
        percentage,
        count: data.count,
        color: meta.color,
        icon: meta.icon,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totalAvailableBalance = roundMoney(
    accounts.reduce((acc, item) => acc.plus(toDecimal(item.currentBalance)), new Decimal(0))
  );
  const totalSavedInGoals = roundMoney(
    goals.reduce((acc, item) => acc.plus(toDecimal(item.savedAmount)), new Decimal(0))
  );

  return {
    monthKey,
    monthLabel,
    previousMonthLabel,
    totalExpenses,
    totalIncome,
    previousMonthExpenses,
    expenseDifferenceAmount,
    expenseDifferencePercent,
    totalAvailableBalance,
    totalSavedInGoals,
    dailySeries,
    categoryBreakdown,
  };
}

export function advanceDateByFrequency(dateStr: string, frequency: RecurringFrequency): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (frequency === 'daily') {
    date.setUTCDate(date.getUTCDate() + 1);
  } else if (frequency === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7);
  } else {
    const targetMonth = date.getUTCMonth() + 1;
    date.setUTCMonth(targetMonth);
  }
  return date.toISOString().slice(0, 10);
}

export function getPeriodKeyForDate(dateStr: string, frequency: RecurringFrequency): string {
  if (frequency === 'monthly') {
    return `monthly:${dateStr.slice(0, 7)}`;
  }
  if (frequency === 'weekly') {
    return `weekly:${dateStr}`;
  }
  return `daily:${dateStr}`;
}

