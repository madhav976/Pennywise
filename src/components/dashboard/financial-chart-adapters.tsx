'use client';

import { curveMonotoneX } from 'd3-shape';
import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
  XAxis,
} from '@/components/charts';
import {
  buildExpenseBarData,
  buildFinancialTrendData,
  formatCurrency,
  type DashboardDateRange,
} from '@/modules/finance/chart-data/finance-chart-data';
import type { FinancialSummaryDTO } from '@/types/finance';
import type { StatisticFilters } from './statistic-card';

interface EmptyChartStateProps {
  label: string;
  compact?: boolean;
}

function EmptyChartState({ label, compact = false }: EmptyChartStateProps) {
  return (
    <div
      className={`h-full w-full rounded-xl border border-dashed border-white/10 bg-[#211E2A]/40 px-3 text-center text-xs text-[#A09BAE] flex items-center justify-center ${
        compact ? 'min-h-[56px]' : 'min-h-[180px]'
      }`}
    >
      {label}
    </div>
  );
}

interface FinancialStatisticsChartProps {
  dailyCashFlow: FinancialSummaryDTO['dailyCashFlow'];
  currency: string;
  filters: StatisticFilters;
}

/** Thin data adapter around the supplied Bklit UI AreaChart composition. */
export function FinancialStatisticsChart({
  dailyCashFlow,
  currency,
  filters,
}: FinancialStatisticsChartProps) {
  const chartData = useMemo(
    () => buildFinancialTrendData(dailyCashFlow, filters.period),
    [dailyCashFlow, filters.period]
  );
  const hasData = chartData.some((item) => item.revenue > 0 || item.costs > 0);

  if (!hasData) {
    return <EmptyChartState label="No posted income or expense transactions in this period." />;
  }

  const showIncome = filters.category !== 'expenses';
  const showExpenses = filters.category !== 'income';

  // Compute dynamic Y-axis ticks matching the reference image's left scale
  const maxVal = Math.max(
    50,
    ...chartData.map((d) => Math.max(showIncome ? d.revenue : 0, showExpenses ? d.costs : 0))
  );
  const niceMax = Math.ceil(maxVal / 50) * 50;
  const yTicks = Array.from({ length: 7 }, (_, i) =>
    Math.round((niceMax / 6) * (6 - i))
  );

  const sym = currency === 'INR' ? '₹' : '$';

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex items-stretch w-full flex-1 min-h-[195px]">
        {/* Left Y-Axis Scale Column (Matches Reference Statistic Card) */}
        <div
          aria-hidden="true"
          className="flex flex-col justify-between pt-3 pb-7 pr-2.5 text-[10px] font-medium text-[#7E7890] select-none shrink-0 tabular-nums"
        >
          {yTicks.map((tick, idx) => (
            <span key={idx}>
              {sym}
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
            </span>
          ))}
        </div>

        {/* Supplied Bklit UI AreaChart */}
        <div className="flex-1 min-w-0">
          <AreaChart
            aspectRatio="3.1 / 1"
            data={chartData}
            margin={{ top: 12, right: 12, bottom: 28, left: 8 }}
            className="w-full h-full min-h-[190px]"
          >
            <Grid horizontal />
            {showIncome && (
              <Area
                curve={curveMonotoneX}
                dataKey="revenue"
                fill="var(--chart-line-primary)"
                fillOpacity={0.3}
                strokeWidth={2.25}
              />
            )}
            {showExpenses && (
              <Area
                curve={curveMonotoneX}
                dataKey="costs"
                fill="var(--chart-line-secondary)"
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
            )}
            <SegmentBackground />
            <SegmentLineFrom />
            <SegmentLineTo />
            <XAxis numTicks={7} />
            <ChartTooltip
              rows={(point) => [
                ...(showIncome
                  ? [
                      {
                        color: 'var(--chart-line-primary)',
                        label: 'Income',
                        value: formatCurrency(Number(point.revenue) || 0, currency),
                      },
                    ]
                  : []),
                ...(showExpenses
                  ? [
                      {
                        color: 'var(--chart-line-secondary)',
                        label: 'Expenses',
                        value: formatCurrency(Number(point.costs) || 0, currency),
                      },
                    ]
                  : []),
                {
                  color: '#65D6A1',
                  label: 'Net cash flow',
                  value: formatCurrency(Number(point.netCashFlow) || 0, currency),
                },
              ]}
            />
          </AreaChart>
        </div>
      </div>

      {/* Bottom Legend Row (Matches Reference Pill Dots) */}
      <div className="flex items-center justify-center gap-5 pt-1 text-[11px] font-medium text-[#A09BAE]">
        {showIncome && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A99BFF] shadow-[0_0_8px_#A99BFF]" />
            <span className="text-[#E2DFEC]">Income</span>
          </span>
        )}
        {showExpenses && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F17D8B] shadow-[0_0_8px_#F17D8B]" />
            <span className="text-[#E2DFEC]">Expenses</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#65D6A1]/80" />
          <span>Net Cash Flow</span>
        </span>
      </div>
    </div>
  );
}

interface MonthlyIncomeAreaChartProps {
  dailyCashFlow: FinancialSummaryDTO['dailyCashFlow'];
  currency: string;
}

/** Thin data adapter around the supplied Bklit UI AreaChart for the Your Income card. */
export function MonthlyIncomeAreaChart({
  dailyCashFlow,
  currency,
}: MonthlyIncomeAreaChartProps) {
  const chartData = useMemo(
    () => buildFinancialTrendData(dailyCashFlow, 'month'),
    [dailyCashFlow]
  );
  const hasData = chartData.some((item) => item.revenue > 0);

  if (!hasData) {
    return <EmptyChartState label="No posted income" compact />;
  }

  return (
    <AreaChart
      aspectRatio="4.6 / 1"
      data={chartData}
      margin={{ top: 6, right: 4, bottom: 4, left: 4 }}
      style={{ height: 64 }}
      className="w-full h-[64px]"
    >
      <Grid horizontal />
      <Area
        curve={curveMonotoneX}
        dataKey="revenue"
        fill="var(--chart-line-primary)"
        fillOpacity={0.32}
        strokeWidth={2}
        showMarkers
      />
      <SegmentBackground />
      <SegmentLineFrom />
      <SegmentLineTo />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => [
          {
            color: 'var(--chart-line-primary)',
            label: 'Income',
            value: formatCurrency(Number(point.revenue) || 0, currency),
          },
        ]}
      />
    </AreaChart>
  );
}

interface MonthlyExpenseBarChartProps {
  dailyExpenditure: FinancialSummaryDTO['dailyExpenditure'];
  currency: string;
  range: DashboardDateRange;
}

/** Thin data adapter around the supplied Bklit UI BarChart composition. */
export function MonthlyExpenseBarChart({
  dailyExpenditure,
  currency,
  range,
}: MonthlyExpenseBarChartProps) {
  const chartData = useMemo(
    () => buildExpenseBarData(dailyExpenditure, range),
    [dailyExpenditure, range]
  );
  const hasData = chartData.some((item) => item.orders > 0);

  if (!hasData) {
    return <EmptyChartState label="No posted expenses" compact />;
  }

  return (
    <BarChart
      data={chartData}
      xDataKey="month"
      aspectRatio="4.6 / 1"
      margin={{ top: 6, right: 4, bottom: 4, left: 4 }}
      barGap={0.35}
      className="w-full h-[64px]"
    >
      <Grid horizontal />
      <Bar
        dataKey="orders"
        fill="var(--chart-line-primary)"
        lineCap="round"
        showValue={range === 'day'}
        valueLabelFormatter={(value) => formatCurrency(value, currency)}
      />
      <BarXAxis maxLabels={0} />
      <ChartTooltip
        showDatePill={false}
        rows={(point) => [
          {
            color: 'var(--chart-line-primary)',
            label: 'Expenses',
            value: formatCurrency(Number(point.orders) || 0, currency),
          },
        ]}
      />
    </BarChart>
  );
}
