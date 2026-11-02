import { describe, expect, it } from 'vitest';
import {
  buildExpenseBarData,
  buildExpenseCategoryData,
  buildFinancialTrendData,
  formatCurrency,
} from '@/modules/finance/chart-data/finance-chart-data';

describe('Finance Chart Data Adapters (Bklit UI Integration)', () => {
  const fixedNow = new Date('2026-11-05T12:00:00.000Z');

  it('transforms dailyCashFlow into AreaChart revenue, costs, and netCashFlow series', () => {
    const dailyCashFlow = [
      { date: '2026-11-01', totalIncome: '5000.00', totalExpenses: '1200.00' },
      { date: '2026-11-03', totalIncome: '0.00', totalExpenses: '850.50' },
      { date: '2026-11-05', totalIncome: '3200.00', totalExpenses: '400.00' },
    ];

    const series = buildFinancialTrendData(dailyCashFlow, 'month', fixedNow);

    expect(series).toHaveLength(5);
    expect(series[0].date).toBeInstanceOf(Date);
    expect(series[0].revenue).toBe(5000);
    expect(series[0].costs).toBe(1200);
    expect(series[0].netCashFlow).toBe(3800);

    // Unposted days default to 0
    expect(series[1].revenue).toBe(0);
    expect(series[1].costs).toBe(0);
    expect(series[1].netCashFlow).toBe(0);

    expect(series[2].revenue).toBe(0);
    expect(series[2].costs).toBe(850.5);
    expect(series[2].netCashFlow).toBe(-850.5);
  });

  it('transforms dailyExpenditure into BarChart month/orders points across ranges', () => {
    const dailyExpenditure = [
      { date: '2026-11-02', totalAmount: '320.00' },
      { date: '2026-11-05', totalAmount: '145.00' },
    ];

    const dayData = buildExpenseBarData(dailyExpenditure, 'day', fixedNow);
    expect(dayData).toHaveLength(1);
    expect(dayData[0].month).toBe('Today');
    expect(dayData[0].orders).toBe(145);

    const monthData = buildExpenseBarData(dailyExpenditure, 'month', fixedNow);
    expect(monthData).toHaveLength(5);
    expect(monthData[1].orders).toBe(320);
    expect(monthData[4].orders).toBe(145);
  });

  it('transforms categoryExpenditure into PieChart slices and filters zero-value categories', () => {
    const categoryExpenditure = [
      { categoryId: 'c1', categoryName: 'Food', totalAmount: '2500.00', percentage: 50 },
      { categoryId: 'c2', categoryName: 'Utilities', totalAmount: '1500.00', percentage: 30 },
      { categoryId: 'c3', categoryName: 'Travel', totalAmount: '0.00', percentage: 0 },
    ];

    const slices = buildExpenseCategoryData(categoryExpenditure);

    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({
      label: 'Food',
      value: 2500,
      amount: 2500,
      percentage: 50,
    });
    expect(slices[1]).toMatchObject({
      label: 'Utilities',
      value: 1500,
      amount: 1500,
      percentage: 30,
    });
  });

  it('formats currency values cleanly', () => {
    expect(formatCurrency(8293, 'INR')).toContain('8,293');
    expect(formatCurrency(305, 'USD')).toContain('305');
  });
});

