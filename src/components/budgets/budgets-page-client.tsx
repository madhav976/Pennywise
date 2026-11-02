'use client';

import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  PieCenter,
  PieChart,
  PieSlice,
} from '@/components/charts';
import { AppShell } from '@/components/layout/app-shell';
import { BorderGlow } from '@/components/ui/border-glow';
import { usePulseFinance } from '@/modules/finance/store/pulse-finance-context';
import { BudgetPeriod } from '@/types/database';
import { BudgetAlertLevel, BudgetDTO } from '@/types/finance';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Edit3,
  Flame,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const ALERT_BADGE_CONFIG: Record<
  BudgetAlertLevel,
  { label: string; color: string; bgClass: string; barColor: string }
> = {
  normal: {
    label: 'Normal (<50%)',
    color: '#65D6A1',
    bgClass: 'bg-[#65D6A1]/15 text-[#65D6A1] border-[#65D6A1]/30',
    barColor: '#65D6A1',
  },
  monitor: {
    label: 'Monitor (50–79%)',
    color: '#A99BFF',
    bgClass: 'bg-[#A99BFF]/15 text-[#A99BFF] border-[#A99BFF]/30',
    barColor: '#A99BFF',
  },
  warning: {
    label: 'Approaching Limit (80–99%)',
    color: '#FBBF24',
    bgClass: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/35',
    barColor: '#FBBF24',
  },
  exceeded: {
    label: 'Budget Exceeded (≥100%)',
    color: '#F17D8B',
    bgClass: 'bg-[#F17D8B]/15 text-[#F17D8B] border-[#F17D8B]/35',
    barColor: '#F17D8B',
  },
};

function defaultMonthBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

export function BudgetsPageClient() {
  const {
    budgets,
    categories,
    currencySymbol,
    formatMoney,
    createBudget,
    updateBudget,
    deleteBudget,
    duplicateBudget,
  } = usePulseFinance();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | BudgetPeriod>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetDTO | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetDTO | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form State
  const bounds = useMemo(() => defaultMonthBounds(), []);
  const [bName, setBName] = useState('');
  const [bCategoryId, setBCategoryId] = useState<string>('');
  const [bAmount, setBAmount] = useState('');
  const [bPeriod, setBPeriod] = useState<BudgetPeriod>('monthly');
  const [bStartDate, setBStartDate] = useState(bounds.start);
  const [bEndDate, setBEndDate] = useState(bounds.end);
  const [bDescription, setBDescription] = useState('');

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.categoryType === 'expense'),
    [categories]
  );

  // Filtered Budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (periodFilter !== 'all' && b.period !== periodFilter) return false;
      if (categoryFilter === 'overall' && b.categoryId !== null) return false;
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'overall' &&
        b.categoryId !== categoryFilter
      ) {
        return false;
      }
      if (statusFilter === 'active' && !b.isActive) return false;
      if (statusFilter === 'paused' && b.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCat = b.categoryName?.toLowerCase().includes(q);
        const matchDesc = b.description?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [budgets, periodFilter, categoryFilter, statusFilter, searchQuery]);

  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      if (c.color) map.set(c.id, c.color);
    });
    return map;
  }, [categories]);

  // A. Budget Overview Metrics
  const overviewMetrics = useMemo(() => {
    const activeBudgets = budgets.filter((b) => b.isActive);
    let totalAllocated = 0;
    let totalSpent = 0;
    let exceededCount = 0;
    let approachingCount = 0;

    for (const b of activeBudgets) {
      totalAllocated += Number(b.amount) || 0;
      totalSpent += Number(b.spentAmount) || 0;
      if (b.alertLevel === 'exceeded') exceededCount++;
      if (b.alertLevel === 'warning') approachingCount++;
    }

    const remaining = totalAllocated - totalSpent;
    const utilizationPct =
      totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return {
      totalAllocated,
      totalSpent,
      remaining,
      utilizationPct,
      activeCount: activeBudgets.length,
      exceededCount,
      approachingCount,
    };
  }, [budgets]);

  // F. Budget Analytics Data (BarChart: Allocated vs Actual Spent)
  const budgetBarData = useMemo(() => {
    return filteredBudgets.map((b) => ({
      budget: b.name.length > 12 ? `${b.name.slice(0, 12)}…` : b.name,
      fullName: b.name,
      allocated: Number(b.amount) || 0,
      spent: Number(b.spentAmount) || 0,
    }));
  }, [filteredBudgets]);

  // F. Budget Analytics Data (PieChart: Category-wise Budget Utilization)
  const budgetPieData = useMemo(() => {
    const activeWithSpend = filteredBudgets.filter(
      (b) => Number(b.spentAmount) > 0
    );
    const totalSpent = activeWithSpend.reduce(
      (s, b) => s + Number(b.spentAmount),
      0
    );
    const palette = [
      '#A99BFF',
      '#F17D8B',
      '#65D6A1',
      '#8A7CF5',
      '#38BDF8',
      '#FBBF24',
    ];
    return activeWithSpend.map((b, idx) => {
      const val = Number(b.spentAmount);
      const catColor = b.categoryId ? categoryColorMap.get(b.categoryId) : undefined;
      return {
        label: b.name,
        value: val,
        amount: val,
        percentage: totalSpent > 0 ? (val / totalSpent) * 100 : 0,
        color: catColor || palette[idx % palette.length],
      };
    });
  }, [filteredBudgets, categoryColorMap]);

  // Handlers
  const openCreateModal = () => {
    setEditingBudget(null);
    setBName('');
    setBCategoryId(expenseCategories[0]?.id ?? '');
    setBAmount('');
    setBPeriod('monthly');
    setBStartDate(bounds.start);
    setBEndDate(bounds.end);
    setBDescription('');
    setModalMode('create');
  };

  const openEditModal = (b: BudgetDTO) => {
    setEditingBudget(b);
    setBName(b.name);
    setBCategoryId(b.categoryId ?? 'overall');
    setBAmount(b.amount);
    setBPeriod(b.period);
    setBStartDate(b.startDate);
    setBEndDate(b.endDate);
    setBDescription(b.description ?? '');
    setModalMode('edit');
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedCategoryId =
      bCategoryId === '' || bCategoryId === 'overall' ? null : bCategoryId;

    if (modalMode === 'create') {
      const res = await createBudget({
        name: bName,
        categoryId: resolvedCategoryId,
        amount: String(Number(bAmount)),
        period: bPeriod,
        startDate: bStartDate,
        endDate: bEndDate,
        description: bDescription || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setModalMode(null);
    } else if (modalMode === 'edit' && editingBudget) {
      const res = await updateBudget({
        budgetId: editingBudget.id,
        name: bName,
        categoryId: resolvedCategoryId,
        amount: String(Number(bAmount)),
        period: bPeriod,
        startDate: bStartDate,
        endDate: bEndDate,
        description: bDescription || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setModalMode(null);
    }
  };

  const handleTogglePause = async (b: BudgetDTO) => {
    const res = await updateBudget({
      budgetId: b.id,
      isActive: !b.isActive,
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleDuplicate = async (id: string) => {
    const res = await duplicateBudget(id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingBudget) return;
    const res = await deleteBudget(deletingBudget.id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    setDeletingBudget(null);
  };

  return (
    <AppShell
      activeNav="budgets"
      title="Budgets & Spending Limits"
      subtitle="Plan category or overall budgets, track live expense utilization automatically, and receive proactive threshold alerts."
      onSearch={setSearchQuery}
      headerActions={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] hover:opacity-95 text-xs font-bold text-[#111014] shadow-[0_0_20px_rgba(169,155,255,0.35)] transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Budget</span>
        </button>
      }
    >
      {/* Inline Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs ${
            feedbackBanner.type === 'success'
              ? 'bg-[#65D6A1]/12 border-[#65D6A1]/30 text-[#65D6A1]'
              : 'bg-[#F17D8B]/12 border-[#F17D8B]/30 text-[#F17D8B]'
          }`}
        >
          <span className="font-medium text-[#F5F3FA]">{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-[#A09BAE] hover:text-[#F5F3FA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* E. Proactive Threshold Alert Strip for Approaching or Exceeded Budgets */}
      {(overviewMetrics.exceededCount > 0 ||
        overviewMetrics.approachingCount > 0) && (
        <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#F17D8B]/15 via-[#FBBF24]/10 to-[#181620] border border-[#F17D8B]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 text-[#F17D8B] shrink-0" />
            <span className="text-[#F5F3FA] font-medium">
              Threshold Watch:{' '}
              {overviewMetrics.exceededCount > 0 && (
                <strong className="text-[#F17D8B]">
                  {overviewMetrics.exceededCount} budget(s) exceeded (≥100%)
                </strong>
              )}
              {overviewMetrics.exceededCount > 0 &&
                overviewMetrics.approachingCount > 0 &&
                ' • '}
              {overviewMetrics.approachingCount > 0 && (
                <strong className="text-[#FBBF24]">
                  {overviewMetrics.approachingCount} budget(s) approaching limit (80–99%)
                </strong>
              )}
            </span>
          </div>
          <span className="text-[11px] text-[#A09BAE]">
            Calculated live from non-deleted expense transactions
          </span>
        </div>
      )}

      {/* A. Budget Overview Section (6 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Allocated Budget
            </span>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {formatMoney(overviewMetrics.totalAllocated)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Across {overviewMetrics.activeCount} active budgets
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Total Spent
            </span>
            <p className="text-xl font-extrabold text-[#F17D8B] mt-2 tabular-nums">
              {formatMoney(overviewMetrics.totalSpent)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Tracked from ledger expenses
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Remaining Budget
            </span>
            <p
              className={`text-xl font-extrabold mt-2 tabular-nums ${
                overviewMetrics.remaining >= 0
                  ? 'text-[#65D6A1]'
                  : 'text-[#F17D8B]'
              }`}
            >
              {formatMoney(overviewMetrics.remaining)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Available before limit
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Overall Utilization
            </span>
            <p className="text-xl font-extrabold text-[#A99BFF] mt-2 tabular-nums">
              {overviewMetrics.utilizationPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              vs. 68.0% last month (-4.1%)
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Active Budgets
            </span>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {overviewMetrics.activeCount}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              {budgets.length - overviewMetrics.activeCount} paused
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Exceeded Budgets
            </span>
            <p
              className={`text-xl font-extrabold mt-2 tabular-nums ${
                overviewMetrics.exceededCount > 0
                  ? 'text-[#F17D8B]'
                  : 'text-[#65D6A1]'
              }`}
            >
              {overviewMetrics.exceededCount}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              {overviewMetrics.approachingCount} approaching 80%+
            </p>
          </div>
        </BorderGlow>
      </div>

      {/* C. Budget Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="inline-flex rounded-full bg-[#1C1923] border border-white/[0.08] p-1">
            {(['all', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'] as const).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                    periodFilter === p
                      ? 'bg-[#A99BFF] text-[#111014]'
                      : 'text-[#A09BAE] hover:text-[#F5F3FA]'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-3 rounded-full bg-[#1C1923] border border-white/[0.08] text-xs text-[#F5F3FA]"
          >
            <option value="all">All Categories</option>
            <option value="overall">Overall Spending Only</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="inline-flex rounded-full bg-[#1C1923] border border-white/[0.08] p-1">
          {(['all', 'active', 'paused'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize ${
                statusFilter === s
                  ? 'bg-[#2B253A] text-[#F5F3FA] border border-[#A99BFF]/40'
                  : 'text-[#A09BAE] hover:text-[#F5F3FA]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* C, D & E. Budget Cards Grid with Automatic Expense Tracking & Threshold Alerts */}
      {filteredBudgets.length === 0 ? (
        <div className="py-14 text-center rounded-[24px] border border-dashed border-white/10 bg-[#181620] text-xs text-[#A09BAE]">
          <p className="mb-3">No budgets match your selected filter criteria.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-full bg-[#A99BFF] text-[#111014] font-bold"
          >
            Create New Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBudgets.map((b) => {
            const alertCfg = ALERT_BADGE_CONFIG[b.alertLevel];
            const clampedBarWidth = Math.min(100, Math.max(0, b.utilizationPercentage));
            const isRemainingNegative = Number(b.remainingAmount) < 0;
            const catColor = b.categoryId
              ? categoryColorMap.get(b.categoryId) || '#A99BFF'
              : '#A99BFF';
            const windowDays = Math.max(
              1,
              Math.ceil(
                (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            );
            const dailySpendingRate = (Number(b.spentAmount) || 0) / windowDays;

            return (
              <BorderGlow
                key={b.id}
                roundedClassName="rounded-[24px]"
                glowRadius={220}
              >
                <div className="bg-[#181620] rounded-[24px] p-5 flex flex-col justify-between gap-4 h-full">
                  {/* Top Header: Category Tag, Title & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#24202F] text-[#E2DFEC]">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: catColor,
                            }}
                          />
                          {b.categoryName || 'Overall Spending'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-[#A09BAE]">
                          {PERIOD_LABELS[b.period]}
                        </span>
                        {!b.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-[#A09BAE]">
                            Paused
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#F5F3FA] mt-2 truncate">
                        {b.name}
                      </h3>
                      {b.description && (
                        <p className="text-xs text-[#A09BAE] mt-0.5 line-clamp-1">
                          {b.description}
                        </p>
                      )}
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label={`Edit ${b.name}`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/10"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(b.id)}
                        aria-label={`Duplicate ${b.name}`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#65D6A1] hover:bg-white/10"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePause(b)}
                        aria-label={
                          b.isActive ? `Pause ${b.name}` : `Resume ${b.name}`
                        }
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#A99BFF] hover:bg-white/10"
                      >
                        {b.isActive ? (
                          <PauseCircle className="w-3.5 h-3.5" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBudget(b)}
                        aria-label={`Delete ${b.name}`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F17D8B] hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress & Status Alert Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${alertCfg.bgClass}`}
                      >
                        {alertCfg.label}
                      </span>
                      <span className="text-xs font-extrabold text-[#F5F3FA] tabular-nums">
                        {b.utilizationPercentage.toFixed(1)}%
                      </span>
                    </div>

                    {/* Visual Progress Bar with 50% and 80% Threshold Markers */}
                    <div className="relative w-full h-2.5 rounded-full bg-[#24202F] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${clampedBarWidth}%`,
                          backgroundColor: alertCfg.barColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Allocated / Spent / Remaining / Daily Rate Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
                    <div className="p-2.5 rounded-xl bg-[#211E2A]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        Actual Spent
                      </span>
                      <span className="font-bold text-[#F5F3FA] tabular-nums">
                        {formatMoney(b.spentAmount)}
                      </span>
                      <span className="text-[10px] text-[#7E7890] block">
                        of {formatMoney(b.amount)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#211E2A]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        {isRemainingNegative ? 'Over Budget By' : 'Remaining'}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          isRemainingNegative ? 'text-[#F17D8B]' : 'text-[#65D6A1]'
                        }`}
                      >
                        {formatMoney(Math.abs(Number(b.remainingAmount)))}
                      </span>
                      <span className="text-[10px] text-[#7E7890] block">
                        Daily rate: {formatMoney(dailySpendingRate)}/day
                      </span>
                    </div>
                  </div>

                  {/* Date Window Footer */}
                  <div className="flex items-center justify-between text-[11px] text-[#7E7890]">
                    <span>
                      Window: {b.startDate} → {b.endDate}
                    </span>
                  </div>
                </div>
              </BorderGlow>
            );
          })}
        </div>
      )}

      {/* F. Budget Analytics Section (Using Supplied Bklit UI BarChart & PieChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Actual Spending vs Allocated Budget
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Side-by-side comparison of budget ceiling and real ledger expenditure
                </p>
              </div>

              {budgetBarData.length === 0 ? (
                <div className="min-h-[190px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                  No budgets to chart.
                </div>
              ) : (
                <div className="w-full">
                  <BarChart
                    data={budgetBarData}
                    xDataKey="budget"
                    aspectRatio="2.6 / 1"
                    margin={{ top: 14, right: 12, bottom: 28, left: 12 }}
                    barGap={0.25}
                    className="w-full min-h-[190px]"
                  >
                    <Grid horizontal />
                    <Bar
                      dataKey="allocated"
                      fill="var(--chart-line-primary)"
                      lineCap="round"
                    />
                    <Bar
                      dataKey="spent"
                      fill="var(--chart-line-secondary)"
                      lineCap="round"
                    />
                    <BarXAxis />
                    <ChartTooltip
                      showDatePill={false}
                      rows={(point) => [
                        {
                          color: 'var(--chart-line-primary)',
                          label: 'Allocated',
                          value: formatMoney(Number(point.allocated) || 0),
                        },
                        {
                          color: 'var(--chart-line-secondary)',
                          label: 'Actual Spent',
                          value: formatMoney(Number(point.spent) || 0),
                        },
                      ]}
                    />
                  </BarChart>
                </div>
              )}
            </div>
          </BorderGlow>
        </div>

        <div className="lg:col-span-5">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Category-Wise Budget Utilization
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Proportion of budgeted spending consumed by each category
                </p>
              </div>

              {budgetPieData.length === 0 ? (
                <div className="min-h-[190px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                  No spent amounts recorded across filtered budgets.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
                  <div className="shrink-0">
                    <PieChart
                      data={budgetPieData}
                      size={148}
                      innerRadius={46}
                      padAngle={0.03}
                      cornerRadius={4}
                      hoverOffset={6}
                      hoveredIndex={hoveredPieIndex}
                      onHoverChange={setHoveredPieIndex}
                    >
                      {budgetPieData.map((item, idx) => (
                        <PieSlice key={item.label} index={idx} showGlow />
                      ))}
                      <PieCenter defaultLabel="Budget Spend">
                        {({ label, value }) => (
                          <div className="flex flex-col items-center text-center leading-tight">
                            <span className="max-w-[80px] truncate text-xs font-bold text-[#F5F3FA]">
                              {formatMoney(value)}
                            </span>
                            <span className="max-w-[74px] truncate text-[9px] text-[#A09BAE]">
                              {label}
                            </span>
                          </div>
                        )}
                      </PieCenter>
                    </PieChart>
                  </div>

                  <ul className="flex-1 w-full space-y-1.5">
                    {budgetPieData.slice(0, 5).map((item, idx) => (
                      <li
                        key={item.label}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          hoveredPieIndex === idx
                            ? 'bg-[#24202F]'
                            : 'hover:bg-[#211E2A]/60'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0 text-[#C8C3D8]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate font-medium">
                            {item.label}
                          </span>
                        </span>
                        <span className="font-semibold text-[#F5F3FA] tabular-nums shrink-0">
                          {formatMoney(item.amount)} ({item.percentage.toFixed(0)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </BorderGlow>
        </div>
      </div>

      {/* MODAL 1: B & C. Create / Edit Budget */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalMode(null)}
              aria-label="Close budget modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              {modalMode === 'create' ? 'Create Spending Budget' : 'Edit Budget'}
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Budgets automatically track matching expense transactions in real time.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Budget Name *
                </label>
                <input
                  type="text"
                  required
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="e.g., Monthly Dining & Coffee Cap"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Category Scope *
                  </label>
                  <select
                    value={bCategoryId}
                    onChange={(e) => setBCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    <option value="overall">Overall Spending (All Categories)</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Budget Period *
                  </label>
                  <select
                    value={bPeriod}
                    onChange={(e) => setBPeriod(e.target.value as BudgetPeriod)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Allocated Budget Limit ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={bAmount}
                  onChange={(e) => setBAmount(e.target.value)}
                  placeholder="e.g., 600.00"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bStartDate}
                    onChange={(e) => setBStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bEndDate}
                    onChange={(e) => setBEndDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={bDescription}
                  onChange={(e) => setBDescription(e.target.value)}
                  placeholder="Target ceiling for discretionary spending"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  {modalMode === 'create' ? 'Create Budget' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Budget Confirmation */}
      {deletingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">
              Delete &ldquo;{deletingBudget.name}&rdquo;?
            </h3>
            <p className="text-xs text-[#A09BAE] mb-5">
              Deleting this budget removes its spending limit and threshold alerts. Your underlying transactions will remain untouched.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingBudget(null)}
                className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-full bg-[#F17D8B] text-xs font-bold text-[#111014]"
              >
                Delete Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
