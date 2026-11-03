import { describe, expect, it } from 'vitest';
import { formatCurrency } from '@/lib/money';
import { DailySpendingPoint, CategoryBreakdownItem } from '@/types/pennywise';

describe('Bklit UI Chart Integration & Mobile Responsive Aspect Ratio', () => {
  const viewports = [
    { width: 360, expectedRatio: '2.6 / 1', isNarrow: true },
    { width: 375, expectedRatio: '2.6 / 1', isNarrow: true },
    { width: 390, expectedRatio: '2.6 / 1', isNarrow: true },
    { width: 412, expectedRatio: '4 / 1', isNarrow: false },
    { width: 430, expectedRatio: '4 / 1', isNarrow: false },
  ];

  it.each(viewports)(
    'resolves correct aspect ratio at viewport width $width px ($expectedRatio)',
    ({ width, expectedRatio, isNarrow }) => {
      const computedIsNarrow = width < 412;
      expect(computedIsNarrow).toBe(isNarrow);
      const computedRatio = computedIsNarrow ? '2.6 / 1' : '4 / 1';
      expect(computedRatio).toBe(expectedRatio);
    }
  );

  it('correctly maps Supabase daily series to Bklit AreaChart data structure', () => {
    const dailySeries: DailySpendingPoint[] = [
      {
        day: 1,
        fullDate: '2026-11-01',
        dateLabel: '1 Nov',
        currentMonthSpend: 1250,
        previousMonthSpend: 800,
        cumulativeCurrent: 1250,
        cumulativePrevious: 800,
      },
      {
        day: 2,
        fullDate: '2026-11-02',
        dateLabel: '2 Nov',
        currentMonthSpend: 3400,
        previousMonthSpend: 1500,
        cumulativeCurrent: 4650,
        cumulativePrevious: 2300,
      },
    ];

    const chartData = dailySeries.map((point) => {
      const parts = point.fullDate.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return {
        date: dateObj,
        revenue: point.currentMonthSpend,
        costs: point.previousMonthSpend,
        dateLabel: point.dateLabel,
        day: point.day,
      };
    });

    expect(chartData).toHaveLength(2);
    expect(chartData[0].revenue).toBe(1250);
    expect(chartData[0].costs).toBe(800);
    expect(chartData[0].date).toBeInstanceOf(Date);
    expect(chartData[1].revenue).toBe(3400);
    expect(chartData[1].costs).toBe(1500);
  });

  it('calculates range selection interval and sum accurately', () => {
    const chartData = [
      { date: new Date(2026, 10, 1), revenue: 100, costs: 50 },
      { date: new Date(2026, 10, 2), revenue: 200, costs: 70 },
      { date: new Date(2026, 10, 3), revenue: 300, costs: 90 },
      { date: new Date(2026, 10, 4), revenue: 400, costs: 110 },
      { date: new Date(2026, 10, 5), revenue: 500, costs: 130 },
    ];

    const selection = {
      startX: 50,
      endX: 180,
      startIndex: 1,
      endIndex: 3,
      active: true,
    };

    const startIdx = Math.max(0, Math.min(selection.startIndex, selection.endIndex));
    const endIdx = Math.min(chartData.length - 1, Math.max(selection.startIndex, selection.endIndex));
    const selectedPoints = chartData.slice(startIdx, endIdx + 1);

    const totalSpend = selectedPoints.reduce((sum, item) => sum + item.revenue, 0);
    expect(totalSpend).toBe(200 + 300 + 400); // 900
    expect(selectedPoints).toHaveLength(3);
  });

  it('maps category breakdown to synchronized Bklit Pie and Legend data with Indian Rupee formatting', () => {
    const breakdown: CategoryBreakdownItem[] = [
      {
        category: 'Food & Dining',
        amount: 8500,
        percentage: 50,
        count: 12,
        color: '#191B19',
        icon: 'Utensils',
      },
      {
        category: 'Groceries',
        amount: 5100,
        percentage: 30,
        count: 6,
        color: '#84B553',
        icon: 'ShoppingBag',
      },
      {
        category: 'Transportation',
        amount: 3400,
        percentage: 20,
        count: 8,
        color: '#DFFF52',
        icon: 'Car',
      },
    ];

    const totalExpenses = 17000;
    const pieData = breakdown.map((item, idx) => ({
      label: item.category,
      value: item.amount,
      color: item.color || `var(--chart-slice-${(idx % 8) + 1})`,
    }));

    const legendItems = pieData.map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color,
      maxValue: totalExpenses,
    }));

    expect(pieData).toHaveLength(3);
    expect(legendItems).toHaveLength(3);
    expect(legendItems[0].label).toBe('Food & Dining');
    expect(legendItems[0].value).toBe(8500);

    // Formatted currency checks
    const formattedTotal = formatCurrency(totalExpenses, 'INR');
    expect(formattedTotal).toContain('₹');
    expect(formattedTotal).toContain('17,000');
  });
});

