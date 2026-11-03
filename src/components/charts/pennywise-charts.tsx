'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { curveMonotoneX } from 'd3-shape';
import {
  AreaChart,
  Area,
  Grid,
  XAxis,
  ChartTooltip,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
  PieChart,
  PieSlice,
  PieCenter,
  Legend,
  LegendItem,
  LegendMarker,
  LegendLabel,
  type ChartSelection,
} from '@/components/ui/charts';
import {
  CategoryBreakdownItem,
  DailySpendingPoint,
  MonthlyAnalyticsSummary,
} from '@/types/pennywise';
import { formatCurrency } from '@/lib/money';
import { PwIcon, PercentagePillBadge } from '@/components/ui/pw-icon';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLegendItem } from '@/components/ui/charts/legend/legend-context';

/**
 * Responsive aspect ratio helper:
 * Below 412px: approximately 2.6:1
 * 412px and above: 4:1
 */
function useIsMobileNarrow() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsNarrow(typeof window !== 'undefined' && window.innerWidth < 412);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isNarrow;
}

/**
 * 1. Monthly Spending Trend — Interactive Bklit Area Chart
 * Features:
 * - Exact supplied JSX component structure
 * - Real Supabase financial series mapping
 * - Range selection with SegmentBackground, SegmentLineFrom, SegmentLineTo
 * - Non-blocking vertical scroll on touch (touch-action: pan-y)
 * - Responsive aspect ratio: <412px: 2.6 / 1; >=412px: 4 / 1
 * - Indian Rupee (₹) formatting
 */
export function MonthlySpendingAreaChart({
  dailySeries,
  totalExpenses,
  monthLabel,
  currency,
}: {
  dailySeries: DailySpendingPoint[];
  totalExpenses: number;
  monthLabel: string;
  currency: string;
}) {
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [selection, setSelection] = useState<ChartSelection | null>(null);
  const isNarrow = useIsMobileNarrow();
  const hasSpending = totalExpenses > 0;

  // Transform Supabase/Ledger daily series into Bklit chart data
  const chartData = useMemo(() => {
    if (!dailySeries || dailySeries.length === 0) return [];
    return dailySeries.map((point) => {
      let dateObj: Date;
      if (point.fullDate) {
        const parts = point.fullDate.split('-').map(Number);
        dateObj = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      } else {
        dateObj = new Date(2024, 0, point.day || 1);
      }
      const currentVal =
        viewMode === 'daily' ? point.currentMonthSpend : point.cumulativeCurrent;
      const previousVal =
        viewMode === 'daily' ? point.previousMonthSpend : point.cumulativePrevious;

      return {
        date: dateObj,
        revenue: currentVal,
        costs: previousVal,
        dateLabel: point.dateLabel || `Day ${point.day}`,
        day: point.day,
      };
    });
  }, [dailySeries, viewMode]);

  // Compute selected date range and total spend
  const selectedRangeSummary = useMemo(() => {
    if (!selection || !selection.active || chartData.length === 0) return null;
    const startIdx = Math.max(
      0,
      Math.min(selection.startIndex, selection.endIndex)
    );
    const endIdx = Math.min(
      chartData.length - 1,
      Math.max(selection.startIndex, selection.endIndex)
    );
    const slice = chartData.slice(startIdx, endIdx + 1);
    if (slice.length === 0) return null;

    const total = slice.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
    const startDate = slice[0]?.date
      ? slice[0].date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        })
      : '';
    const endDate = slice[slice.length - 1]?.date
      ? slice[slice.length - 1].date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
        })
      : '';

    return { total, startDate, endDate, count: slice.length };
  }, [selection, chartData]);

  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  return (
    <div className="bg-[#EBF0E9] rounded-[28px] p-4 border border-[#E7EBE5]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19]">
            <PwIcon name="TrendingUp" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#191B19] tracking-tight">
              Monthly Spending Trend
            </h3>
            <p className="text-[11px] text-[#777F77]">{monthLabel}</p>
          </div>
        </div>

        {/* Mode Toggle Pill */}
        <div className="inline-flex items-center bg-white rounded-full p-0.5 border border-[#E7EBE5]">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-[#191B19] text-white shadow-xs'
                : 'text-[#777F77]'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cumulative')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              viewMode === 'cumulative'
                ? 'bg-[#191B19] text-white shadow-xs'
                : 'text-[#777F77]'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      {!hasSpending ? (
        <div className="h-[175px] rounded-2xl bg-white/70 border border-dashed border-[#CFD7CB] flex flex-col items-center justify-center px-4 text-center">
          <p className="text-xs font-medium text-[#191B19]">
            No expenses recorded in {monthLabel}
          </p>
          <p className="text-[11px] text-[#777F77] mt-1">
            Add an expense or scan a receipt to visualize your monthly spending area chart.
          </p>
        </div>
      ) : (
        <div className="w-full pt-1">
          {/* Exact Supplied AreaChart JSX Implementation */}
          <AreaChart
            aspectRatio={isNarrow ? '2.6 / 1' : '4 / 1'}
            data={chartData}
            onSelectionChange={setSelection}
          >
            <Grid horizontal />
            <Area
              curve={curveMonotoneX}
              dataKey="revenue"
              fill="var(--chart-line-primary)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              curve={curveMonotoneX}
              dataKey="costs"
              fill="var(--chart-line-secondary)"
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
            <SegmentBackground />
            <SegmentLineFrom />
            <SegmentLineTo />
            <XAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: 'var(--chart-line-primary)',
                  label: `${monthLabel} (${viewMode})`,
                  value: formatCurrency(Number(point.revenue || 0), currency),
                },
                {
                  color: 'var(--chart-line-secondary)',
                  label: `Prior Month (${viewMode})`,
                  value: formatCurrency(Number(point.costs || 0), currency),
                },
              ]}
            />
          </AreaChart>

          {/* Interactive Range Selection Callout */}
          {selectedRangeSummary && (
            <div className="mt-3 px-3.5 py-2.5 rounded-2xl bg-[#191B19] text-white flex items-center justify-between text-xs animate-fadeIn shadow-pw-card">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#DFFF52] shrink-0" />
                <span className="text-[11px] text-[#E7EBE5] truncate">
                  Selected:{' '}
                  <strong className="text-white font-semibold">
                    {selectedRangeSummary.startDate} – {selectedRangeSummary.endDate}
                  </strong>{' '}
                  ({selectedRangeSummary.count} days)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-[#DFFF52] text-xs">
                  {formatCurrency(selectedRangeSummary.total, currency)}
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-white/70 hover:text-white text-[10px] underline ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 2. Previous Month Comparison — Dual-Series Bklit Area Chart
 * Features:
 * - Exact supplied AreaChart JSX component structure
 * - Dual area curves comparing current vs prior month cumulative spending
 * - Responsive aspect ratio: <412px: 2.6 / 1; >=412px: 4 / 1
 * - Preserved summary strip, badges, and monetary comparisons
 */
export function PreviousMonthComparisonChart({
  analytics,
  currency,
}: {
  analytics: MonthlyAnalyticsSummary;
  currency: string;
}) {
  const {
    dailySeries,
    monthLabel,
    previousMonthLabel,
    totalExpenses,
    previousMonthExpenses,
    expenseDifferenceAmount,
    expenseDifferencePercent,
  } = analytics;

  const isNarrow = useIsMobileNarrow();
  const hasAnyData = totalExpenses > 0 || previousMonthExpenses > 0;
  const isSpendingHigher = expenseDifferenceAmount > 0;
  const isSpendingLower = expenseDifferenceAmount < 0;

  // Comparison series mapped to revenue (current) and costs (prior)
  const chartData = useMemo(() => {
    if (!dailySeries || dailySeries.length === 0) return [];
    return dailySeries.map((point) => {
      let dateObj: Date;
      if (point.fullDate) {
        const parts = point.fullDate.split('-').map(Number);
        dateObj = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      } else {
        dateObj = new Date(2024, 0, point.day || 1);
      }
      return {
        date: dateObj,
        revenue: point.cumulativeCurrent,
        costs: point.cumulativePrevious,
        dateLabel: point.dateLabel || `Day ${point.day}`,
        day: point.day,
      };
    });
  }, [dailySeries]);

  return (
    <div className="bg-white rounded-[28px] p-4 border border-[#E7EBE5] shadow-pw-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EBF0E9] flex items-center justify-center text-[#191B19]">
            <PwIcon name="Calendar" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#191B19] tracking-tight">
              Previous Month Comparison
            </h3>
            <p className="text-[11px] text-[#777F77]">
              Cumulative spending trajectory
            </p>
          </div>
        </div>

        {/* Difference Badge in Monetary & Percentage terms */}
        {hasAnyData && (
          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
              isSpendingLower
                ? 'bg-[#DFFF52] text-[#191B19]'
                : isSpendingHigher
                ? 'bg-[#FFEFEF] text-[#B42318]'
                : 'bg-[#EBF0E9] text-[#191B19]'
            }`}
          >
            {isSpendingLower ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : isSpendingHigher ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : null}
            <span>
              {expenseDifferencePercent !== null
                ? `${expenseDifferencePercent > 0 ? '+' : ''}${expenseDifferencePercent}%`
                : formatCurrency(expenseDifferenceAmount, currency, {
                    showSign: true,
                    compact: true,
                  })}
            </span>
          </div>
        )}
      </div>

      {/* Monetary Summary Strip */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="rounded-2xl bg-[#F5F7F3] p-3 border border-[#E7EBE5]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#191B19]" />
            <span className="text-[11px] text-[#777F77] font-medium truncate">
              {monthLabel}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#191B19] mt-1">
            {formatCurrency(totalExpenses, currency)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F5F7F3] p-3 border border-[#E7EBE5]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#84B553]" />
            <span className="text-[11px] text-[#777F77] font-medium truncate">
              {previousMonthLabel}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#191B19] mt-1">
            {formatCurrency(previousMonthExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Difference Callout Banner */}
      <div className="mb-3 px-3 py-2 rounded-2xl bg-[#EBF0E9]/70 flex items-center justify-between text-xs">
        <span className="text-[#777F77]">
          Difference vs {previousMonthLabel.split(' ')[0]}
        </span>
        <span className="font-semibold text-[#191B19]">
          {formatCurrency(expenseDifferenceAmount, currency, { showSign: true })}
          {expenseDifferencePercent !== null
            ? ` (${expenseDifferencePercent > 0 ? '+' : ''}${expenseDifferencePercent}%)`
            : ' (No prior month spend)'}
        </span>
      </div>

      {!hasAnyData ? (
        <div className="h-[165px] rounded-2xl bg-[#F5F7F3] border border-dashed border-[#D8DFD4] flex flex-col items-center justify-center px-4 text-center">
          <p className="text-xs font-medium text-[#191B19]">
            No comparison data yet
          </p>
          <p className="text-[11px] text-[#777F77] mt-1">
            Record expenses in {monthLabel} or {previousMonthLabel} to compare periods.
          </p>
        </div>
      ) : (
        <div className="w-full pt-1">
          {/* Exact Supplied AreaChart JSX Implementation */}
          <AreaChart
            aspectRatio={isNarrow ? '2.6 / 1' : '4 / 1'}
            data={chartData}
          >
            <Grid horizontal />
            <Area
              curve={curveMonotoneX}
              dataKey="revenue"
              fill="var(--chart-line-primary)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              curve={curveMonotoneX}
              dataKey="costs"
              fill="var(--chart-line-secondary)"
              fillOpacity={0.2}
              strokeWidth={1.5}
            />
            <SegmentBackground />
            <SegmentLineFrom />
            <SegmentLineTo />
            <XAxis />
            <ChartTooltip
              rows={(point) => [
                {
                  color: 'var(--chart-line-primary)',
                  label: `${monthLabel}`,
                  value: formatCurrency(Number(point.revenue || 0), currency),
                },
                {
                  color: 'var(--chart-line-secondary)',
                  label: `${previousMonthLabel}`,
                  value: formatCurrency(Number(point.costs || 0), currency),
                },
              ]}
            />
          </AreaChart>
        </div>
      )}
    </div>
  );
}

/**
 * Legend Item Details — displays formatted amount and percentage
 */
function CategoryLegendStats({ currency }: { currency: string }) {
  const { item, percentage } = useLegendItem();

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs font-semibold text-[#191B19]">
        {formatCurrency(item.value, currency)}
      </span>
      <span className="text-[10px] font-semibold text-[#191B19] bg-[#EBF0E9] px-2 py-0.5 rounded-full">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

/**
 * 3. Category Analytics — Interactive Bklit Pie Chart with Synchronized Legend
 * Features:
 * - Exact supplied PieChart & Legend JSX component structure
 * - PieCenter showing "Total Spent" and formatted amount in center
 * - Synchronized hover/tap between pie slices and legend
 * - Indian Rupee (₹) formatting
 * - Seamless integration with Pennywise design palette
 */
export function CategoryDonutChart({
  breakdown,
  totalExpenses,
  monthLabel,
  currency,
  onSelectCategoryFilter,
}: {
  breakdown: CategoryBreakdownItem[];
  totalExpenses: number;
  monthLabel: string;
  currency: string;
  onSelectCategoryFilter?: (category: string) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Map real Supabase/Ledger breakdown to Bklit pie data
  const pieData = useMemo(() => {
    return breakdown.map((item, idx) => ({
      label: item.category,
      value: item.amount,
      color: item.color || `var(--chart-slice-${(idx % 8) + 1})`,
    }));
  }, [breakdown]);

  // Map to Bklit legend items
  const legendItems = useMemo(() => {
    return pieData.map((d) => ({
      label: d.label,
      value: d.value,
      color: d.color,
      maxValue: totalExpenses || 1,
    }));
  }, [pieData, totalExpenses]);

  const activeCategory =
    hoveredIndex !== null && breakdown[hoveredIndex]
      ? breakdown[hoveredIndex]
      : null;

  // Aliased component per supplied code pattern
  const LegendItemComponent = LegendItem;

  return (
    <div className="bg-white rounded-[28px] p-4 border border-[#E7EBE5] shadow-pw-card">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EBF0E9] flex items-center justify-center text-[#191B19]">
            <PwIcon name="CircleDot" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#191B19] tracking-tight">
              Category Analytics
            </h3>
            <p className="text-[11px] text-[#777F77]">
              Tap any slice or legend item to inspect
            </p>
          </div>
        </div>
        {activeCategory ? (
          <PercentagePillBadge
            percentage={activeCategory.percentage}
            variant="lime"
          />
        ) : (
          <span className="text-xs font-semibold text-[#191B19] px-2.5 py-1 rounded-full bg-[#EBF0E9]">
            {breakdown.length} {breakdown.length === 1 ? 'Category' : 'Categories'}
          </span>
        )}
      </div>

      {breakdown.length === 0 ? (
        <div className="h-[165px] rounded-2xl bg-[#F5F7F3] border border-dashed border-[#D8DFD4] flex flex-col items-center justify-center px-4 text-center">
          <p className="text-xs font-medium text-[#191B19]">
            No category breakdown for {monthLabel}
          </p>
          <p className="text-[11px] text-[#777F77] mt-1">
            Categorized expenses will appear here in an interactive donut chart.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Centered Bklit Pie Chart */}
          <div className="flex items-center justify-center py-2">
            <PieChart
              data={pieData}
              hoveredIndex={hoveredIndex}
              innerRadius={55}
              onHoverChange={setHoveredIndex}
              size={180}
            >
              {pieData.map((_, i) => (
                <PieSlice index={i} key={i} />
              ))}
              <PieCenter defaultLabel="Total Spent">
                {({ value, label, isHovered }) => (
                  <div className="flex flex-col items-center justify-center text-center px-2 select-none">
                    <span className="text-[10px] font-semibold text-[#777F77] uppercase tracking-wider truncate max-w-[88px]">
                      {isHovered ? label : 'Total Spent'}
                    </span>
                    <span className="text-sm font-bold text-[#191B19] tracking-tight mt-0.5">
                      {formatCurrency(value, currency, {
                        compact: value >= 100000,
                      })}
                    </span>
                    {isHovered && totalExpenses > 0 && (
                      <span className="text-[9px] font-semibold text-[#191B19] bg-[#DFFF52] px-1.5 py-0.2 rounded-full mt-0.5">
                        {((value / totalExpenses) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>

          {/* Interactive Bklit Legend */}
          <Legend
            hoveredIndex={hoveredIndex}
            items={legendItems}
            onHoverChange={setHoveredIndex}
            className="w-full space-y-1.5"
          >
            <LegendItemComponent className="flex items-center justify-between p-2 rounded-2xl transition-all hover:bg-[#F5F7F3]">
              <div className="flex items-center gap-2.5 min-w-0">
                <LegendMarker className="w-2.5 h-2.5 rounded-full shrink-0" />
                <LegendLabel className="text-xs font-semibold text-[#191B19] truncate" />
              </div>
              <CategoryLegendStats currency={currency} />
            </LegendItemComponent>
          </Legend>

          {/* Filter Action Pill if callback is provided and a category is active */}
          {onSelectCategoryFilter && activeCategory && (
            <div className="flex justify-end pt-1 animate-fadeIn">
              <button
                type="button"
                onClick={() => onSelectCategoryFilter(activeCategory.category)}
                className="px-3 py-1.5 rounded-full bg-[#191B19] text-white text-[11px] font-medium hover:bg-[#202320] transition-colors"
              >
                Filter by {activeCategory.category}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
