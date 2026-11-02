'use client';

import React, { useMemo, useState } from 'react';
import { PieCenter, PieChart, PieSlice } from '@/components/charts';
import {
  buildExpenseCategoryData,
  formatCurrency,
} from '@/modules/finance/chart-data/finance-chart-data';
import type { FinancialSummaryDTO } from '@/types/finance';
import { BorderGlow } from '@/components/ui/border-glow';

interface SpendingBreakdownCardProps {
  categoryExpenditure: FinancialSummaryDTO['categoryExpenditure'];
  currency: string;
  onSwitchAccount?: () => void;
}

/**
 * Financial Overview card in the lower-right dashboard area.
 * Reuses the supplied Bklit UI PieChart, PieSlice, and PieCenter components
 * wrapped in the pure-white BorderGlow container.
 */
export function SpendingBreakdownCard({
  categoryExpenditure,
  currency,
  onSwitchAccount,
}: SpendingBreakdownCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const pieData = useMemo(
    () => buildExpenseCategoryData(categoryExpenditure),
    [categoryExpenditure]
  );

  return (
    <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240} className="w-full">
      <section className="bg-[#181620] rounded-[24px] p-5 flex flex-col justify-between min-h-[192px]">
        {/* Header Row (Matches Reference Lower-Right Card Header) */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight text-[#F5F3FA]">
              Financial Overview
            </h2>
          </div>

          <button
            type="button"
            onClick={onSwitchAccount}
            className="px-3.5 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.08] text-[11px] font-medium text-[#E2DFEC] transition-colors shrink-0"
          >
            Switch account
          </button>
        </div>

        {pieData.length === 0 ? (
          <div className="min-h-[120px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 px-4 text-center text-xs text-[#A09BAE] flex items-center justify-center">
            No categorized expenses in this period.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Supplied Bklit UI Donut / PieChart */}
            <div className="shrink-0 flex items-center justify-center">
              <PieChart
                data={pieData}
                size={128}
                innerRadius={40}
                padAngle={0.035}
                cornerRadius={4}
                hoverOffset={6}
                hoveredIndex={hoveredIndex}
                onHoverChange={setHoveredIndex}
              >
                {pieData.map((item, index) => (
                  <PieSlice index={index} key={item.label} showGlow />
                ))}
                <PieCenter defaultLabel="Total">
                  {({ label, value }) => (
                    <div className="flex flex-col items-center text-center leading-tight">
                      <span className="max-w-[72px] truncate text-[11px] font-bold text-[#F5F3FA]">
                        {formatCurrency(value, currency)}
                      </span>
                      <span className="max-w-[68px] truncate text-[9px] text-[#A09BAE]">
                        {label}
                      </span>
                    </div>
                  )}
                </PieCenter>
              </PieChart>
            </div>

            {/* Category Labels, Spending Percentages & Financial Amounts */}
            <ul
              className="flex-1 w-full space-y-1.5"
              aria-label="Expense category breakdown"
            >
              {pieData.slice(0, 4).map((item, index) => (
                <li
                  key={item.label}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    hoveredIndex === index ? 'bg-[#24202F]' : 'hover:bg-[#211E2A]/60'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-[#C8C3D8]">
                    <span
                      className="w-2 h-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-medium">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-right font-semibold text-[#F5F3FA] tabular-nums">
                    {formatCurrency(item.amount, currency)}{' '}
                    <span className="text-[10px] font-normal text-[#A09BAE] ml-0.5">
                      ({item.percentage.toFixed(0)}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </BorderGlow>
  );
}
