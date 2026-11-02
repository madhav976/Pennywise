'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BorderGlow } from '@/components/ui/border-glow';

export interface StatisticFilters {
  category: 'all' | 'income' | 'expenses';
  period: 'week' | 'month';
}

interface StatisticCardProps {
  chartSlot?: React.ReactNode;
  renderChart?: (filters: StatisticFilters) => React.ReactNode;
  onFilterMemberChange?: (member: string) => void;
  onFilterCategoryChange?: (category: string) => void;
  onFilterPeriodChange?: (period: string) => void;
}

export function StatisticCard({
  chartSlot,
  renderChart,
  onFilterMemberChange,
  onFilterCategoryChange,
  onFilterPeriodChange,
}: StatisticCardProps) {
  const [selectedMember, setSelectedMember] = useState('All members');
  const [selectedCategory, setSelectedCategory] = useState<StatisticFilters['category']>('all');
  const [selectedPeriod, setSelectedPeriod] = useState('This week');

  const categoryLabel =
    selectedCategory === 'all'
      ? 'Category: All'
      : selectedCategory === 'income'
        ? 'Category: Income'
        : 'Category: Expenses';

  return (
    <BorderGlow roundedClassName="rounded-[24px]" glowRadius={280} className="w-full">
      <div className="bg-[#181620] rounded-[24px] p-5 sm:p-6 flex flex-col justify-between min-h-[296px]">
        {/* Top Header & Pill Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-[18px] font-bold tracking-tight text-[#F5F3FA]">Statistic</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Member / Account Filter */}
            <button
              type="button"
              onClick={() => {
                const next = selectedMember === 'All members' ? 'Primary account' : 'All members';
                setSelectedMember(next);
                onFilterMemberChange?.(next);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2C273A] border border-white/[0.08] text-[11px] font-medium text-[#E2DFEC] transition-colors"
            >
              <span>{selectedMember}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A09BAE]" />
            </button>

            {/* Category Filter */}
            <button
              type="button"
              onClick={() => {
                const next =
                  selectedCategory === 'all'
                    ? 'expenses'
                    : selectedCategory === 'expenses'
                      ? 'income'
                      : 'all';
                setSelectedCategory(next);
                onFilterCategoryChange?.(next);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2C273A] border border-white/[0.08] text-[11px] font-medium text-[#E2DFEC] transition-colors"
            >
              <span>{categoryLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A09BAE]" />
            </button>

            {/* Period Filter */}
            <button
              type="button"
              onClick={() => {
                const next = selectedPeriod === 'This week' ? 'This month' : 'This week';
                setSelectedPeriod(next);
                onFilterPeriodChange?.(next);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2C273A] border border-white/[0.08] text-[11px] font-medium text-[#E2DFEC] transition-colors"
            >
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A09BAE]" />
            </button>
          </div>
        </div>

        {/* Main Chart Canvas */}
        <div className="w-full flex-1 flex items-center justify-center">
          {renderChart ? (
            renderChart({
              category: selectedCategory,
              period: selectedPeriod === 'This month' ? 'month' : 'week',
            })
          ) : chartSlot ? (
            chartSlot
          ) : null}
        </div>
      </div>
    </BorderGlow>
  );
}
