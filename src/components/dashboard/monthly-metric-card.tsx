'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { BorderGlow } from '@/components/ui/border-glow';

interface MonthlyMetricCardProps {
  title: string;
  periodLabel?: string;
  formattedAmount: string;
  percentageChange?: string;
  isPositiveChange?: boolean;
  onOpenDetails?: () => void;
  chartSlot?: React.ReactNode;
  chartControls?: React.ReactNode;
  chartType: 'mini-line' | 'mini-bar';
}

export function MonthlyMetricCard({
  title,
  periodLabel = 'Current month',
  formattedAmount,
  percentageChange,
  isPositiveChange = true,
  onOpenDetails,
  chartSlot,
  chartControls,
  chartType,
}: MonthlyMetricCardProps) {
  return (
    <BorderGlow roundedClassName="rounded-[22px]" glowRadius={220} className="w-full">
      <div className="bg-[#181620] rounded-[22px] p-4 sm:px-5 sm:pt-4 sm:pb-3 flex flex-col justify-between h-[152px] relative overflow-hidden">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2 relative z-10">
          <div>
            <h3 className="font-semibold text-[15px] text-[#F5F3FA] tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-[11px] text-[#A09BAE] leading-tight">{periodLabel}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {chartControls}
            <button
              type="button"
              onClick={onOpenDetails}
              aria-label={`View ${title} details`}
              className="w-8 h-8 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.08] flex items-center justify-center text-[#A09BAE] hover:text-[#F5F3FA] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Amount & Previous-Month Comparison Row */}
        <div className="flex items-baseline gap-2.5 mt-1 relative z-10">
          <div className="text-[24px] sm:text-[26px] font-bold tracking-tight text-[#F5F3FA] leading-none">
            {formattedAmount}
          </div>

          {percentageChange && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isPositiveChange
                  ? 'bg-[#65D6A1]/10 text-[#65D6A1] border-[#65D6A1]/20'
                  : 'bg-[#F17D8B]/10 text-[#F17D8B] border-[#F17D8B]/20'
              }`}
            >
              {percentageChange}
            </span>
          )}
        </div>

        {/* Compact Chart Canvas Bleeding Across Bottom of Card */}
        <div className="w-full h-[64px] -mx-1 mt-1 relative z-10 flex items-end justify-center">
          {chartSlot ? (
            <div className="w-full h-full">{chartSlot}</div>
          ) : (
            <div
              data-chart-integration-slot={chartType}
              className="w-full h-full rounded-xl bg-[#211E2A]/40 border border-dashed border-white/10 flex items-center justify-center text-[10px] text-[#A09BAE]"
            >
              {chartType === 'mini-line' ? 'Income Trend' : 'Expense Bars'}
            </div>
          )}
        </div>
      </div>
    </BorderGlow>
  );
}
