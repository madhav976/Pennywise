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
import { SavingsGoalDTO } from '@/types/finance';
import {
  Award,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  PauseCircle,
  PiggyBank,
  PlayCircle,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

const GOAL_CATEGORIES = [
  'Emergency Fund',
  'Travel',
  'Education',
  'Gadget / Purchase',
  'Investment',
  'Custom',
];

const GOAL_COLORS = [
  '#65D6A1',
  '#A99BFF',
  '#38BDF8',
  '#FBBF24',
  '#F17D8B',
  '#8A7CF5',
];

export function SavingsPageClient() {
  const {
    accounts,
    savingsGoals,
    currencySymbol,
    formatMoney,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
  } = usePulseFinance();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'completed' | 'paused'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Modals
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalDTO | null>(null);
  const [contributingGoal, setContributingGoal] =
    useState<SavingsGoalDTO | null>(null);
  const [viewingGoal, setViewingGoal] = useState<SavingsGoalDTO | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoalDTO | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Create / Edit Goal Form State
  const [gName, setGName] = useState('');
  const [gCategory, setGCategory] = useState('Emergency Fund');
  const [gTargetAmount, setGTargetAmount] = useState('');
  const [gInitialAmount, setGInitialAmount] = useState('0');
  const [gTargetDate, setGTargetDate] = useState('');
  const [gColor, setGColor] = useState('#65D6A1');
  const [gDescription, setGDescription] = useState('');

  // Contribute Form State
  const [cAmount, setCAmount] = useState('');
  const [cSourceAccountId, setCSourceAccountId] = useState(
    accounts.find((a) => a.isActive)?.id ?? ''
  );
  const [cDate, setCDate] = useState(new Date().toISOString().slice(0, 10));
  const [cNote, setCNote] = useState('');

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return savingsGoals.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchCat = g.category.toLowerCase().includes(q);
        const matchDesc = g.description?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [savingsGoals, statusFilter, categoryFilter, searchQuery]);

  // A. Savings Overview Metrics
  const overviewMetrics = useMemo(() => {
    const activeGoals = savingsGoals.filter((g) => g.status === 'active');
    const completedGoals = savingsGoals.filter((g) => g.status === 'completed');

    const totalSavedActive = activeGoals.reduce(
      (sum, g) => sum + (Number(g.currentAmount) || 0),
      0
    );
    const totalTargetActive = activeGoals.reduce(
      (sum, g) => sum + (Number(g.targetAmount) || 0),
      0
    );
    const totalSavedAll = savingsGoals.reduce(
      (sum, g) => sum + (Number(g.currentAmount) || 0),
      0
    );
    const overallProgressPct =
      totalTargetActive > 0 ? (totalSavedActive / totalTargetActive) * 100 : 0;

    // Nearest upcoming target date among active goals
    const upcomingGoal = [...activeGoals]
      .filter((g) => g.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

    return {
      totalSavedActive,
      totalTargetActive,
      totalSavedAll,
      overallProgressPct,
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      upcomingGoal,
    };
  }, [savingsGoals]);

  // F. Monthly Contributions BarChart Data
  const monthlyContribData = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of savingsGoals) {
      for (const c of g.contributions ?? []) {
        const ym = c.contributionDate.slice(0, 7); // YYYY-MM
        map.set(ym, (map.get(ym) ?? 0) + (Number(c.amount) || 0));
      }
    }
    const entries = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    if (entries.length === 0) {
      return [
        { month: 'Current', contributions: 0 },
      ];
    }
    return entries.map(([ym, amt]) => {
      const [y, m] = ym.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      return {
        month: label,
        contributions: Math.round(amt * 100) / 100,
      };
    });
  }, [savingsGoals]);

  // F. Goal-Wise Progress PieChart Data
  const goalPieData = useMemo(() => {
    const withSavings = savingsGoals.filter(
      (g) => Number(g.currentAmount) > 0
    );
    const total = withSavings.reduce(
      (s, g) => s + Number(g.currentAmount),
      0
    );
    return withSavings.map((g, idx) => {
      const val = Number(g.currentAmount);
      return {
        label: g.name,
        value: val,
        amount: val,
        percentage: total > 0 ? (val / total) * 100 : 0,
        color: g.color || GOAL_COLORS[idx % GOAL_COLORS.length],
      };
    });
  }, [savingsGoals]);

  // Handlers
  const openCreateModal = () => {
    setEditingGoal(null);
    setGName('');
    setGCategory('Emergency Fund');
    setGTargetAmount('');
    setGInitialAmount('0');
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 180);
    setGTargetDate(future.toISOString().slice(0, 10));
    setGColor('#65D6A1');
    setGDescription('');
    setModalMode('create');
  };

  const openEditModal = (goal: SavingsGoalDTO) => {
    setEditingGoal(goal);
    setGName(goal.name);
    setGCategory(goal.category);
    setGTargetAmount(goal.targetAmount);
    setGInitialAmount(goal.currentAmount);
    setGTargetDate(goal.targetDate);
    setGColor(goal.color || '#65D6A1');
    setGDescription(goal.description || '');
    setModalMode('edit');
  };

  const openContributeModal = (goal: SavingsGoalDTO) => {
    setContributingGoal(goal);
    setCAmount('');
    const firstActive = accounts.find(
      (a) => a.isActive && a.accountType !== 'credit_card'
    );
    setCSourceAccountId(
      firstActive?.id ?? accounts.find((a) => a.isActive)?.id ?? ''
    );
    setCDate(new Date().toISOString().slice(0, 10));
    setCNote('');
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      const res = await createGoal({
        name: gName,
        targetAmount: String(Number(gTargetAmount)),
        initialAmount: String(Number(gInitialAmount) || 0),
        targetDate: gTargetDate,
        category: gCategory,
        color: gColor,
        description: gDescription || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setModalMode(null);
    } else if (modalMode === 'edit' && editingGoal) {
      const res = await updateGoal({
        goalId: editingGoal.id,
        name: gName,
        targetAmount: String(Number(gTargetAmount)),
        targetDate: gTargetDate,
        category: gCategory,
        color: gColor,
        description: gDescription || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setModalMode(null);
    }
  };

  const handleExecuteContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const res = await contributeToGoal({
      goalId: contributingGoal.id,
      sourceAccountId: cSourceAccountId,
      amount: String(Number(cAmount)),
      contributionDate: cDate,
      notes: cNote || undefined,
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setContributingGoal(null);
    }
  };

  const handleTogglePause = async (goal: SavingsGoalDTO) => {
    const nextStatus = goal.status === 'paused' ? 'active' : 'paused';
    const res = await updateGoal({
      goalId: goal.id,
      status: nextStatus,
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleMarkCompleted = async (goal: SavingsGoalDTO) => {
    const res = await updateGoal({
      goalId: goal.id,
      status: 'completed',
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingGoal) return;
    const res = await deleteGoal(deletingGoal.id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    setDeletingGoal(null);
    if (viewingGoal?.id === deletingGoal.id) setViewingGoal(null);
  };

  // Refresh viewingGoal from live store
  const activeViewingGoal = useMemo(
    () =>
      viewingGoal
        ? savingsGoals.find((g) => g.id === viewingGoal.id) ?? viewingGoal
        : null,
    [savingsGoals, viewingGoal]
  );

  return (
    <AppShell
      activeNav="savings"
      title="Savings Goals & Milestones"
      subtitle="Plan financial milestones, fund goals directly from your accounts, and track monthly contribution velocity."
      onSearch={setSearchQuery}
      headerActions={
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] hover:opacity-95 text-xs font-bold text-[#111014] shadow-[0_0_20px_rgba(169,155,255,0.35)] transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Savings Goal</span>
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

      {/* A. Savings Overview Section (6 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Active Goal Savings
            </span>
            <p className="text-xl font-extrabold text-[#65D6A1] mt-2 tabular-nums">
              {formatMoney(overviewMetrics.totalSavedActive)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Total Saved (All): {formatMoney(overviewMetrics.totalSavedAll)}
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Active Target Total
            </span>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {formatMoney(overviewMetrics.totalTargetActive)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Remaining:{' '}
              {formatMoney(
                Math.max(
                  0,
                  overviewMetrics.totalTargetActive -
                    overviewMetrics.totalSavedActive
                )
              )}
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Overall Progress
            </span>
            <p className="text-xl font-extrabold text-[#A99BFF] mt-2 tabular-nums">
              {overviewMetrics.overallProgressPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Weighted across active goals
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Active Goals
            </span>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {overviewMetrics.activeCount}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              In active contribution phase
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Completed Goals
            </span>
            <p className="text-xl font-extrabold text-[#65D6A1] mt-2 tabular-nums">
              {overviewMetrics.completedCount}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              100% funded milestones
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <span className="text-[11px] font-medium text-[#A09BAE]">
              Next Milestone Date
            </span>
            <p className="text-base font-extrabold text-[#F5F3FA] mt-2 truncate">
              {overviewMetrics.upcomingGoal
                ? overviewMetrics.upcomingGoal.targetDate
                : 'No upcoming'}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1 truncate">
              {overviewMetrics.upcomingGoal
                ? `${overviewMetrics.upcomingGoal.name} (${overviewMetrics.upcomingGoal.daysRemaining}d left)`
                : 'All targets clear'}
            </p>
          </div>
        </BorderGlow>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-[#1C1923] border border-white/[0.08] p-1">
          {(['all', 'active', 'completed', 'paused'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-[#A99BFF] text-[#111014]'
                  : 'text-[#A09BAE] hover:text-[#F5F3FA]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 px-3 rounded-full bg-[#1C1923] border border-white/[0.08] text-xs text-[#F5F3FA]"
        >
          <option value="all">All Goal Categories</option>
          {GOAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* E. Savings Goal Cards Grid */}
      {filteredGoals.length === 0 ? (
        <div className="py-14 text-center rounded-[24px] border border-dashed border-white/10 bg-[#181620] text-xs text-[#A09BAE]">
          <p className="mb-3">No savings goals match your current filter.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-full bg-[#A99BFF] text-[#111014] font-bold"
          >
            Create Savings Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            const isPaused = goal.status === 'paused';
            const isOverdue = !isCompleted && goal.daysRemaining < 0;
            const barWidth = Math.min(100, Math.max(0, goal.progressPercentage));

            return (
              <BorderGlow
                key={goal.id}
                roundedClassName="rounded-[24px]"
                glowRadius={220}
              >
                <div className="bg-[#181620] rounded-[24px] p-5 flex flex-col justify-between gap-4 h-full">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#24202F] text-[#E2DFEC]"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: goal.color || '#65D6A1' }}
                          />
                          {goal.category}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            isCompleted
                              ? 'bg-[#65D6A1]/15 text-[#65D6A1]'
                              : isPaused
                                ? 'bg-white/10 text-[#A09BAE]'
                                : 'bg-[#A99BFF]/15 text-[#A99BFF]'
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#F5F3FA] mt-2 truncate">
                        {goal.name}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-[#A09BAE] mt-0.5 line-clamp-1">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    {/* Card Action Icons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingGoal(goal)}
                        aria-label={`View ${goal.name} details`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/10"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        aria-label={`Edit ${goal.name}`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#A99BFF] hover:bg-white/10"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleTogglePause(goal)}
                          aria-label={
                            isPaused ? `Resume ${goal.name}` : `Pause ${goal.name}`
                          }
                          className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/10"
                        >
                          {isPaused ? (
                            <PlayCircle className="w-3.5 h-3.5" />
                          ) : (
                            <PauseCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeletingGoal(goal)}
                        aria-label={`Delete ${goal.name}`}
                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F17D8B] hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#A09BAE] font-medium">
                        {formatMoney(goal.currentAmount)} saved of{' '}
                        <strong className="text-[#F5F3FA]">
                          {formatMoney(goal.targetAmount)}
                        </strong>
                      </span>
                      <span className="font-extrabold text-[#F5F3FA] tabular-nums">
                        {goal.progressPercentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[#24202F] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: isCompleted
                            ? '#65D6A1'
                            : goal.color || '#A99BFF',
                        }}
                      />
                    </div>
                  </div>

                  {/* Remaining & Monthly Required Breakdown */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
                    <div className="p-2.5 rounded-xl bg-[#211E2A]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        Remaining to Target
                      </span>
                      <span className="font-bold text-[#F5F3FA] tabular-nums">
                        {formatMoney(goal.remainingAmount)}
                      </span>
                      <span className="text-[10px] text-[#7E7890] block">
                        Target: {goal.targetDate}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#211E2A]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        Est. Monthly Needed
                      </span>
                      <span className="font-bold text-[#A99BFF] tabular-nums">
                        {isCompleted
                          ? `${currencySymbol}0.00`
                          : `${formatMoney(goal.estimatedMonthlyRequired)}/mo`}
                      </span>
                      <span
                        className={`text-[10px] block ${
                          isCompleted
                            ? 'text-[#65D6A1]'
                            : isOverdue
                              ? 'text-[#F17D8B]'
                              : 'text-[#7E7890]'
                        }`}
                      >
                        {isCompleted
                          ? 'Milestone reached!'
                          : isOverdue
                            ? `${Math.abs(goal.daysRemaining)} days past target`
                            : `${goal.daysRemaining} days remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Footer CTA: Contribute / Complete */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isCompleted ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openContributeModal(goal)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] hover:opacity-95 text-xs font-bold text-[#111014] transition-all"
                        >
                          + Contribute Funds
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(goal)}
                          className="py-2 px-3 rounded-xl bg-[#24202F] hover:bg-[#2E293C] text-xs font-semibold text-[#65D6A1] transition-colors"
                        >
                          Mark Complete
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-2 px-3 rounded-xl bg-[#65D6A1]/15 border border-[#65D6A1]/30 text-xs font-bold text-[#65D6A1] flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Goal Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </BorderGlow>
            );
          })}
        </div>
      )}

      {/* F. Savings Analytics + Monthly Required Formula Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Contributions BarChart */}
        <div className="lg:col-span-5">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Monthly Goal Contributions
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Historical funds transferred into savings goals by month
                </p>
              </div>

              <div className="w-full">
                <BarChart
                  data={monthlyContribData}
                  xDataKey="month"
                  aspectRatio="2.2 / 1"
                  margin={{ top: 14, right: 12, bottom: 28, left: 12 }}
                  barGap={0.3}
                  className="w-full min-h-[185px]"
                >
                  <Grid horizontal />
                  <Bar
                    dataKey="contributions"
                    fill="var(--chart-line-primary)"
                    lineCap="round"
                  />
                  <BarXAxis />
                  <ChartTooltip
                    showDatePill={false}
                    rows={(point) => [
                      {
                        color: 'var(--chart-line-primary)',
                        label: 'Contributed',
                        value: formatMoney(Number(point.contributions) || 0),
                      },
                    ]}
                  />
                </BarChart>
              </div>
            </div>
          </BorderGlow>
        </div>

        {/* Goal-Wise Progress PieChart */}
        <div className="lg:col-span-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Goal-Wise Saved Allocation
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Distribution of accumulated savings across your goals
                </p>
              </div>

              {goalPieData.length === 0 ? (
                <div className="min-h-[185px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                  No goal savings accumulated yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
                  <div className="shrink-0">
                    <PieChart
                      data={goalPieData}
                      size={142}
                      innerRadius={44}
                      padAngle={0.03}
                      cornerRadius={4}
                      hoverOffset={6}
                      hoveredIndex={hoveredPieIndex}
                      onHoverChange={setHoveredPieIndex}
                    >
                      {goalPieData.map((item, idx) => (
                        <PieSlice key={item.label} index={idx} showGlow />
                      ))}
                      <PieCenter defaultLabel="Total Saved">
                        {({ label, value }) => (
                          <div className="flex flex-col items-center text-center leading-tight">
                            <span className="max-w-[78px] truncate text-xs font-bold text-[#F5F3FA]">
                              {formatMoney(value)}
                            </span>
                            <span className="max-w-[72px] truncate text-[9px] text-[#A09BAE]">
                              {label}
                            </span>
                          </div>
                        )}
                      </PieCenter>
                    </PieChart>
                  </div>

                  <ul className="flex-1 w-full space-y-1.5">
                    {goalPieData.map((item, idx) => (
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
                          {item.percentage.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </BorderGlow>
        </div>

        {/* Estimated Monthly Contribution Required Calculator & Explanation */}
        <div className="lg:col-span-3">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Calculator className="w-4 h-4 text-[#A99BFF]" />
                  <h2 className="text-sm font-bold text-[#F5F3FA]">
                    Monthly Pacing Formula
                  </h2>
                </div>
                <p className="text-xs text-[#A09BAE] leading-relaxed">
                  To keep you on schedule, PULSE calculates the exact monthly contribution required for each active goal:
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.06] text-[11px] space-y-1.5">
                <p className="font-mono text-[#A99BFF]">
                  Monthly Required = Remaining ÷ max(1, DaysLeft ÷ 30.44)
                </p>
                <p className="text-[#A09BAE]">
                  • If a goal is within 30 days or past due, the full remaining balance is surfaced as the immediate monthly target.
                </p>
                <p className="text-[#A09BAE]">
                  • Completed goals require {currencySymbol}0.00/mo.
                </p>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[#A09BAE]">Combined Monthly Pace</span>
                <span className="font-extrabold text-[#65D6A1] tabular-nums">
                  {formatMoney(
                    savingsGoals
                      .filter((g) => g.status === 'active')
                      .reduce(
                        (s, g) =>
                          s + (Number(g.estimatedMonthlyRequired) || 0),
                        0
                      )
                  )}
                  /mo
                </span>
              </div>
            </div>
          </BorderGlow>
        </div>
      </div>

      {/* MODAL 1: B & C. Create / Edit Savings Goal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalMode(null)}
              aria-label="Close goal modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              {modalMode === 'create'
                ? 'Create Savings Goal'
                : 'Edit Savings Goal'}
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Define your target amount, target date, and category to track your progress.
            </p>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  value={gName}
                  onChange={(e) => setGName(e.target.value)}
                  placeholder="e.g., 6-Month Emergency Reserve"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Goal Category *
                  </label>
                  <select
                    value={gCategory}
                    onChange={(e) => setGCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    {GOAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={gTargetDate}
                    onChange={(e) => setGTargetDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Target Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={gTargetAmount}
                    onChange={(e) => setGTargetAmount(e.target.value)}
                    placeholder="10000.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>

                {modalMode === 'create' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Initial Saved Amount ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={gInitialAmount}
                      onChange={(e) => setGInitialAmount(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={gDescription}
                  onChange={(e) => setGDescription(e.target.value)}
                  placeholder="Liquid reserve held in high-yield vault"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Goal Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setGColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        gColor === color
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-75'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
                  {modalMode === 'create' ? 'Create Goal' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: D. Contribute Funds to Savings Goal */}
      {contributingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setContributingGoal(null)}
              aria-label="Close contribution modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              Contribute to &ldquo;{contributingGoal.name}&rdquo;
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Remaining to target:{' '}
              <strong className="text-[#65D6A1]">
                {formatMoney(contributingGoal.remainingAmount)}
              </strong>
              . Funds will be deducted from your selected source account.
            </p>

            <form onSubmit={handleExecuteContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Source Account *
                </label>
                <select
                  value={cSourceAccountId}
                  onChange={(e) => setCSourceAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                >
                  {accounts
                    .filter((a) => a.isActive)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} ({formatMoney(a.currentBalance)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Contribution Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={cAmount}
                    onChange={(e) => setCAmount(e.target.value)}
                    placeholder="250.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Contribution Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={cDate}
                    onChange={(e) => setCDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={cNote}
                  onChange={(e) => setCNote(e.target.value)}
                  placeholder="Monthly savings allocation"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setContributingGoal(null)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  Confirm Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: C. View Goal Details & Contribution History */}
      {activeViewingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setViewingGoal(null)}
              aria-label="Close goal details"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#A99BFF]/20 text-[#A99BFF]">
              {activeViewingGoal.category}
            </span>
            <h3 className="text-lg font-extrabold text-[#F5F3FA] mt-2">
              {activeViewingGoal.name}
            </h3>
            {activeViewingGoal.description && (
              <p className="text-xs text-[#A09BAE] mt-0.5">
                {activeViewingGoal.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2.5 my-4 text-xs">
              <div className="p-3 rounded-xl bg-[#211E2A]">
                <span className="text-[10px] text-[#A09BAE] block">Saved</span>
                <span className="font-bold text-[#65D6A1] tabular-nums">
                  {formatMoney(activeViewingGoal.currentAmount)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#211E2A]">
                <span className="text-[10px] text-[#A09BAE] block">Target</span>
                <span className="font-bold text-[#F5F3FA] tabular-nums">
                  {formatMoney(activeViewingGoal.targetAmount)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#211E2A]">
                <span className="text-[10px] text-[#A09BAE] block">Progress</span>
                <span className="font-bold text-[#A99BFF] tabular-nums">
                  {activeViewingGoal.progressPercentage.toFixed(1)}%
                </span>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A09BAE] mb-2.5">
              Contribution History ({(activeViewingGoal.contributions ?? []).length})
            </h4>

            {(activeViewingGoal.contributions ?? []).length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-[#211E2A]/40 border border-dashed border-white/10 text-xs text-[#A09BAE]">
                No contributions recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(activeViewingGoal.contributions ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#211E2A] border border-white/[0.05] text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#F5F3FA]">
                        {c.notes || 'Goal Contribution'}
                      </p>
                      <p className="text-[10px] text-[#A09BAE]">
                        {c.contributionDate} • From {c.sourceAccountName || 'Account'}
                      </p>
                    </div>
                    <span className="font-bold text-[#65D6A1] tabular-nums">
                      +{formatMoney(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/[0.08]">
              {activeViewingGoal.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    const g = activeViewingGoal;
                    setViewingGoal(null);
                    openContributeModal(g);
                  }}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  + Contribute Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingGoal(null)}
                className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#F5F3FA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Goal Confirmation */}
      {deletingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">
              Delete &ldquo;{deletingGoal.name}&rdquo;?
            </h3>
            <p className="text-xs text-[#A09BAE] mb-5">
              This will permanently remove the savings goal and its milestone tracking history.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingGoal(null)}
                className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-full bg-[#F17D8B] text-xs font-bold text-[#111014]"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
