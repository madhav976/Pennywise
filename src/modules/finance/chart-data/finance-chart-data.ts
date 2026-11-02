import type { FinancialSummaryDTO } from '@/types/finance';

export type DashboardDateRange = 'day' | 'week' | 'month';

export interface FinancialTrendDatum extends Record<string, unknown> {
  date: Date;
  revenue: number;
  costs: number;
  netCashFlow: number;
}

export interface ExpenseBarDatum extends Record<string, unknown> {
  month: string;
  orders: number;
  date: string;
}

export interface ExpenseCategoryDatum {
  label: string;
  value: number;
  amount: number;
  percentage: number;
  color: string;
}

const CATEGORY_COLORS = ['#A99BFF', '#65D6A1', '#F17D8B', '#8A7CF5', '#F6C85F'];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRangeBounds(range: DashboardDateRange, now: Date): [Date, Date] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start: Date;

  if (range === 'day') {
    start = new Date(end);
  } else if (range === 'week') {
    const weekday = end.getUTCDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    start = new Date(end);
    start.setUTCDate(end.getUTCDate() + mondayOffset);
  } else {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  }

  return [start, end];
}

function getDateKeys(range: DashboardDateRange, now: Date): string[] {
  const [start, end] = getRangeBounds(range, now);
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Fills calendar days with zero only where the ledger has no posted entry.
 * The monetary values themselves always come from the finance summary service.
 */
export function buildFinancialTrendData(
  dailyCashFlow: FinancialSummaryDTO['dailyCashFlow'],
  range: DashboardDateRange,
  now = new Date()
): FinancialTrendDatum[] {
  const byDate = new Map(
    dailyCashFlow.map((item) => [
      item.date.slice(0, 10),
      {
        revenue: asNumber(item.totalIncome),
        costs: asNumber(item.totalExpenses),
      },
    ])
  );

  // If the database entries fall outside the current UTC calendar week/month window,
  // use the sorted ledger dates directly so historical ledger records still plot cleanly.
  const rangeKeys = getDateKeys(range, now);
  const hasMatchInWindow = rangeKeys.some((key) => byDate.has(key));

  const keysToPlot =
    !hasMatchInWindow && dailyCashFlow.length > 0
      ? dailyCashFlow
          .map((d) => d.date.slice(0, 10))
          .sort()
          .slice(range === 'week' ? -7 : -30)
      : rangeKeys;

  return keysToPlot.map((date) => {
    const totals = byDate.get(date) || { revenue: 0, costs: 0 };
    return {
      date: dateFromKey(date),
      revenue: totals.revenue,
      costs: totals.costs,
      netCashFlow: totals.revenue - totals.costs,
    };
  });
}

export function buildExpenseBarData(
  dailyExpenditure: FinancialSummaryDTO['dailyExpenditure'],
  range: DashboardDateRange,
  now = new Date()
): ExpenseBarDatum[] {
  const byDate = new Map(
    dailyExpenditure.map((item) => [item.date.slice(0, 10), asNumber(item.totalAmount)])
  );
  const labelFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: range === 'month' ? 'short' : undefined,
    timeZone: 'UTC',
  });

  const rangeKeys = getDateKeys(range, now);
  const hasMatchInWindow = rangeKeys.some((key) => byDate.has(key));

  const keysToPlot =
    !hasMatchInWindow && dailyExpenditure.length > 0
      ? dailyExpenditure
          .map((d) => d.date.slice(0, 10))
          .sort()
          .slice(range === 'day' ? -1 : range === 'week' ? -7 : -24)
      : rangeKeys;

  return keysToPlot.map((date) => ({
    month: range === 'day' ? 'Today' : labelFormatter.format(dateFromKey(date)),
    orders: byDate.get(date) || 0,
    date,
  }));
}

export function buildExpenseCategoryData(
  categoryExpenditure: FinancialSummaryDTO['categoryExpenditure']
): ExpenseCategoryDatum[] {
  return categoryExpenditure
    .map((item, index) => {
      const amount = asNumber(item.totalAmount);
      return {
        label: item.categoryName,
        value: amount,
        amount,
        percentage: item.percentage,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
    })
    .filter((item) => item.value > 0);
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
}

/**
 * Fallback summary used strictly when the dashboard is viewed in unauthenticated
 * preview mode (`initialSummary == null`), matching the reference image figures.
 */
export function createPreviewFinancialSummary(): FinancialSummaryDTO {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const dailyCashFlow: FinancialSummaryDTO['dailyCashFlow'] = Array.from(
    { length: 14 },
    (_, i) => {
      const d = new Date(Date.UTC(year, month, Math.max(1, now.getUTCDate() - 13 + i)));
      const dateStr = toDateKey(d);
      const incomeWave = Math.round(180 + Math.sin(i * 0.85) * 110 + (i % 3) * 35);
      const expenseWave = Math.round(95 + Math.cos(i * 0.7) * 55 + (i % 4) * 20);
      return {
        date: dateStr,
        totalIncome: String(incomeWave),
        totalExpenses: String(expenseWave),
      };
    }
  );

  const dailyExpenditure: FinancialSummaryDTO['dailyExpenditure'] = dailyCashFlow.map((d) => ({
    date: d.date,
    totalAmount: d.totalExpenses,
  }));

  return {
    period: 'this_month',
    startDate: dailyCashFlow[0]?.date ?? '2026-11-01',
    endDate: dailyCashFlow[dailyCashFlow.length - 1]?.date ?? '2026-11-14',
    totalIncome: '8293.00',
    totalExpenses: '305.00',
    netCashFlow: '7988.00',
    totalAssets: '24093.00',
    totalLiabilities: '0.00',
    netWorth: '24093.00',
    categoryExpenditure: [
      { categoryId: 'cat-1', categoryName: 'Shopping & Retail', totalAmount: '128.00', percentage: 42 },
      { categoryId: 'cat-2', categoryName: 'Food & Dining', totalAmount: '86.00', percentage: 28 },
      { categoryId: 'cat-3', categoryName: 'Subscriptions', totalAmount: '55.00', percentage: 18 },
      { categoryId: 'cat-4', categoryName: 'Transport', totalAmount: '36.00', percentage: 12 },
    ],
    paymentMethodExpenditure: [],
    dailyExpenditure,
    dailyCashFlow,
  };
}
