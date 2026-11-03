'use client';

import React, { useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import { GOAL_ICONS } from '@/lib/categories';
import { calculateGoalMetrics, formatCurrency, roundMoney } from '@/lib/money';
import { RecurringFrequency, SavingsGoal } from '@/types/pennywise';
import {
  MobileBottomSheet,
  PercentagePillBadge,
  PwIcon,
  PwSpinner,
  SegmentedCapsuleBar,
} from '@/components/ui/pw-icon';
import {
  Calendar,
  Check,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

export function GoalsScreen() {
  const {
    user,
    accounts,
    goals,
    contributions,
    recurringRules,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    saveRecurringContribution,
    toggleRecurringContribution,
    deleteRecurringContribution,
    processDueRecurringContributions,
    setActiveTab,
  } = usePennywise();

  const currency = user?.currency || 'INR';

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(
    null
  );
  const [automatingGoal, setAutomatingGoal] = useState<SavingsGoal | null>(null);
  const [inspectingGoal, setInspectingGoal] = useState<SavingsGoal | null>(null);
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(
    null
  );

  // Create / Edit Goal Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalIcon, setGoalIcon] = useState('smartphone');
  const [initialContribution, setInitialContribution] = useState('');
  const [initialSourceAccId, setInitialSourceAccId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Manual Contribution Form State
  const [contribAmount, setContribAmount] = useState('');
  const [contribSourceAccId, setContribSourceAccId] = useState('');
  const [contribNotes, setContribNotes] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);

  // Recurring Contribution Form State
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recStartDate, setRecStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [recSourceAccId, setRecSourceAccId] = useState('');
  const [recEnabled, setRecEnabled] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);

  // Async loading states for goal operations
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [isContributing, setIsContributing] = useState(false);
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [isProcessingDue, setIsProcessingDue] = useState(false);

  const totalSavedAcrossGoals = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTargetAcrossGoals = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct =
    totalTargetAcrossGoals > 0
      ? Math.min(100, Math.round((totalSavedAcrossGoals / totalTargetAcrossGoals) * 100))
      : 0;

  function openCreateGoalModal() {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setGoalIcon('smartphone');
    setInitialContribution('');
    setInitialSourceAccId(accounts[0]?.id || '');
    setFormError(null);
    setIsSavingGoal(false);
    setIsDeletingGoal(false);
    setIsCreateOpen(true);
  }

  function openEditGoalModal(goal: SavingsGoal) {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate || '');
    setGoalIcon(goal.icon || 'smartphone');
    setInitialContribution('');
    setFormError(null);
    setIsSavingGoal(false);
    setIsDeletingGoal(false);
    setIsCreateOpen(true);
  }

  function openContributeModal(goal: SavingsGoal) {
    setContributingGoal(goal);
    setContribAmount('');
    setContribSourceAccId(accounts[0]?.id || '');
    setContribNotes('');
    setContribError(null);
    setIsContributing(false);
  }

  function openAutomateModal(goal: SavingsGoal) {
    const existingRule = recurringRules.find((r) => r.goalId === goal.id);
    setAutomatingGoal(goal);
    setRecAmount(existingRule ? String(existingRule.amount) : '3000');
    setRecFrequency(existingRule ? existingRule.frequency : 'monthly');
    setRecStartDate(
      existingRule
        ? existingRule.startDate
        : new Date().toISOString().slice(0, 10)
    );
    setRecSourceAccId(existingRule?.sourceAccountId || accounts[0]?.id || '');
    setRecEnabled(existingRule ? existingRule.isEnabled : true);
    setRecError(null);
    setIsSavingRecurring(false);
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (isSavingGoal) return;
    setFormError(null);

    const parsedTarget = parseFloat(targetAmount);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setFormError('Please enter a target amount greater than 0.');
      return;
    }

    setIsSavingGoal(true);
    try {
      if (editingGoal) {
        const res = await updateGoal(editingGoal.id, {
          name: goalName,
          targetAmount: roundMoney(parsedTarget),
          targetDate: targetDate || undefined,
          icon: goalIcon,
        });
        if (!res.ok) {
          setFormError(res.error || 'Could not update goal.');
          return;
        }
        setIsCreateOpen(false);
        return;
      }

      const parsedInit = initialContribution ? parseFloat(initialContribution) : 0;
      if (parsedInit > 0 && !initialSourceAccId) {
        setFormError(
          'Please select a source account for your initial contribution.'
        );
        return;
      }

      const res = await createGoal({
        name: goalName,
        targetAmount: roundMoney(parsedTarget),
        targetDate: targetDate || undefined,
        icon: goalIcon,
        initialContribution: parsedInit > 0 ? roundMoney(parsedInit) : undefined,
        sourceAccountId: parsedInit > 0 ? initialSourceAccId : undefined,
      });

      if (!res.ok) {
        setFormError(res.error || 'Could not create goal.');
        return;
      }

      setIsCreateOpen(false);
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function handleContributeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contributingGoal || isContributing) return;
    setContribError(null);

    const amt = parseFloat(contribAmount);
    if (isNaN(amt) || amt <= 0) {
      setContribError('Please enter a valid contribution amount.');
      return;
    }

    if (!contribSourceAccId) {
      setContribError('Please select a source account.');
      return;
    }

    setIsContributing(true);
    try {
      const res = await contributeToGoal({
        goalId: contributingGoal.id,
        sourceAccountId: contribSourceAccId,
        amount: roundMoney(amt),
        notes: contribNotes.trim() || undefined,
      });

      if (!res.ok) {
        setContribError(res.error || 'Could not complete contribution.');
        return;
      }

      setContributingGoal(null);
    } finally {
      setIsContributing(false);
    }
  }

  async function handleSaveRecurringSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!automatingGoal || isSavingRecurring) return;
    setRecError(null);

    const amt = parseFloat(recAmount);
    if (isNaN(amt) || amt <= 0) {
      setRecError('Contribution amount must be greater than zero.');
      return;
    }

    if (!recSourceAccId) {
      setRecError('Please select a source account.');
      return;
    }

    setIsSavingRecurring(true);
    try {
      const res = await saveRecurringContribution({
        goalId: automatingGoal.id,
        sourceAccountId: recSourceAccId,
        amount: roundMoney(amt),
        frequency: recFrequency,
        startDate: recStartDate,
        isEnabled: recEnabled,
      });

      if (!res.ok) {
        setRecError(res.error || 'Could not save recurring rule.');
        return;
      }

      setAutomatingGoal(null);
    } finally {
      setIsSavingRecurring(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Editorial Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DFFF52] text-[#191B19] flex items-center justify-center shrink-0 shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#191B19]">
              Savings &amp; Goals
            </h1>
            <p className="text-xs text-[#777F77] mt-0.5">
              Allocate funds for upcoming personal purchases
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateGoalModal}
          className="px-3.5 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#DFFF52]" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Overall Goals Hero Card (Styled after Reference Image "Operations" / "Data Transfer" cards) */}
      <div className="bg-[#EBF0E9] rounded-[28px] p-5 border border-[#E7EBE5] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19]">
              <PwIcon name="PiggyBank" className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#191B19]">
              Total Allocated Savings
            </span>
          </div>
          <PercentagePillBadge percentage={overallPct} variant="lime" />
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl font-normal tracking-tight text-[#191B19]">
            {formatCurrency(totalSavedAcrossGoals, currency)}
          </span>
          <span className="text-xs font-medium text-[#777F77]">
            / {formatCurrency(totalTargetAcrossGoals, currency)} target
          </span>
        </div>

        <SegmentedCapsuleBar percentage={overallPct} segments={8} activeColor="charcoal" />
      </div>

      {/* Empty State or Goal Cards */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-[28px] p-7 border border-[#E7EBE5] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#DFFF52] mx-auto flex items-center justify-center text-[#191B19]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#191B19]">
              Create your first savings goal
            </h3>
            <p className="text-xs text-[#777F77] mt-1 max-w-[260px] mx-auto">
              Save toward a new iPhone, laptop, gaming console, or vacation with manual or automated internal allocations.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateGoalModal}
            className="px-5 py-2.5 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#DFFF52]" />
            <span>Create a Savings Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {goals.map((goal, idx) => {
            const metrics = calculateGoalMetrics(goal);
            const rule = recurringRules.find((r) => r.goalId === goal.id);
            const ruleAccount = rule
              ? accounts.find((a) => a.id === rule.sourceAccountId)
              : null;
            const isHighlighted = idx % 2 === 1;

            return (
              <div
                key={goal.id}
                className={`rounded-[28px] p-5 border transition-all space-y-4 ${
                  isHighlighted
                    ? 'bg-[#DFFF52] border-[#CBEB3B]'
                    : 'bg-white border-[#E7EBE5] shadow-pw-card'
                }`}
              >
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isHighlighted
                          ? 'bg-white text-[#191B19]'
                          : 'bg-[#EBF0E9] text-[#191B19]'
                      }`}
                    >
                      <PwIcon name={goal.icon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#191B19] truncate">
                        {goal.name}
                      </h3>
                      <p
                        className={`text-[11px] ${
                          isHighlighted ? 'text-[#191B19]/70' : 'text-[#777F77]'
                        }`}
                      >
                        {metrics.isCompleted
                          ? 'Goal target reached!'
                          : `${formatCurrency(metrics.remainingAmount, currency)} remaining`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <PercentagePillBadge
                      percentage={metrics.percentage}
                      variant={isHighlighted ? 'white' : 'lime'}
                    />
                    <button
                      type="button"
                      onClick={() => openEditGoalModal(goal)}
                      aria-label={`Edit ${goal.name}`}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isHighlighted
                          ? 'bg-white/75 text-[#191B19]'
                          : 'bg-[#F5F7F3] text-[#191B19]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Large Editorial Numerals */}
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-normal tracking-tight text-[#191B19]">
                      {formatCurrency(metrics.savedAmount, currency)}
                    </span>
                    <span
                      className={`text-xs ${
                        isHighlighted ? 'text-[#191B19]/75' : 'text-[#777F77]'
                      }`}
                    >
                      / {formatCurrency(metrics.targetAmount, currency)}
                    </span>
                  </div>

                  {goal.targetDate && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                        isHighlighted
                          ? 'bg-white/70 text-[#191B19]'
                          : 'bg-[#F5F7F3] text-[#777F77]'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      Target: {goal.targetDate}
                    </span>
                  )}
                </div>

                {/* Segmented Capsule Progress Bar */}
                <SegmentedCapsuleBar
                  percentage={metrics.percentage}
                  segments={8}
                  activeColor="charcoal"
                />

                {/* Recurring Contribution Status Banner (if configured) */}
                {rule && (
                  <div
                    className={`p-3 rounded-2xl flex items-center justify-between gap-2 text-xs ${
                      isHighlighted
                        ? 'bg-white/80 border border-white'
                        : 'bg-[#F5F7F3] border border-[#E7EBE5]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#191B19] flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          Auto: {formatCurrency(rule.amount, currency)} /{' '}
                          {rule.frequency}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#777F77] truncate mt-0.5">
                        From {ruleAccount?.name || 'Account'} · Next:{' '}
                        {rule.nextRunDate}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleRecurringContribution(rule.id, !rule.isEnabled)
                      }
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 ${
                        rule.isEnabled
                          ? 'bg-[#191B19] text-[#DFFF52]'
                          : 'bg-[#E7EBE5] text-[#777F77]'
                      }`}
                    >
                      {rule.isEnabled ? 'Enabled' : 'Paused'}
                    </button>
                  </div>
                )}

                {/* Action Buttons: Contribute, Auto-Save, History/Delete */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openContributeModal(goal)}
                    className="flex-1 py-2.5 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#DFFF52]" />
                    <span>Contribute</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAutomateModal(goal)}
                    className={`px-3.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                      isHighlighted
                        ? 'bg-white border-white text-[#191B19]'
                        : 'bg-[#EBF0E9] border-[#E7EBE5] text-[#191B19]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{rule ? 'Auto Rule' : 'Automate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectingGoal(goal)}
                    aria-label="Contribution History"
                    className={`px-3 py-2.5 rounded-full text-xs font-semibold border ${
                      isHighlighted
                        ? 'bg-white/80 border-white text-[#191B19]'
                        : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#777F77]'
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT GOAL SHEET */}
      <MobileBottomSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'Create a Savings Goal'}
        subtitle="Set your target amount, timeline, and optional initial allocation"
        maxHeight="max-h-[88dvh]"
        footer={
          <div className="space-y-2">
            {editingGoal && confirmDeleteGoalId === editingGoal.id && (
              <div className="flex items-center justify-between pb-2 border-b border-[#E7EBE5]">
                <span className="text-xs text-[#E5484D] font-medium">Are you sure?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeletingGoal}
                    onClick={async () => {
                      if (isDeletingGoal) return;
                      setIsDeletingGoal(true);
                      try {
                        await deleteGoal(editingGoal.id);
                        setConfirmDeleteGoalId(null);
                        setIsCreateOpen(false);
                      } finally {
                        setIsDeletingGoal(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#E5484D] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all shadow-xs"
                  >
                    {isDeletingGoal && <PwSpinner className="w-3 h-3 text-white" />}
                    <span>{isDeletingGoal ? 'Deleting...' : 'Confirm Delete'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingGoal}
                    onClick={() => setConfirmDeleteGoalId(null)}
                    className="px-3 py-1.5 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button
              type="submit"
              form="savings-goal-form"
              disabled={isSavingGoal || isDeletingGoal}
              className="w-full h-[52px] rounded-full bg-[#191B19] hover:bg-[#252825] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSavingGoal ? (
                <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
              ) : (
                <Check className="w-4 h-4 text-[#DFFF52]" />
              )}
              <span>
                {isSavingGoal
                  ? 'Saving Goal...'
                  : editingGoal
                  ? 'Save Changes'
                  : 'Create Savings Goal'}
              </span>
            </button>
          </div>
        }
      >
        <form id="savings-goal-form" onSubmit={handleSaveGoal} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D] shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Goal Details */}
          <div className="bg-white rounded-[24px] p-4.5 border border-[#E7EBE5] shadow-xs space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                Goal Name *
              </label>
              <input
                type="text"
                required
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. iPhone 16 Pro, MacBook, Japan Trip"
                className="w-full h-12 px-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-medium text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Target ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#777F77]">
                    {currency === 'INR' ? '₹' : currency}
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="80000"
                    className="w-full h-12 pl-8 pr-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19] focus:outline-none focus:border-[#191B19] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Goal Icon Selection Grid */}
          <div className="bg-white rounded-[24px] p-4.5 border border-[#E7EBE5] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#191B19]">
                Goal Icon
              </label>
              <span className="text-[11px] text-[#777F77]">Tap to select badge</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map((item) => {
                const selected = goalIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoalIcon(item.id)}
                    className={`min-h-[68px] p-1.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                      selected
                        ? 'bg-[#191B19] border-[#191B19] text-[#DFFF52] shadow-sm ring-2 ring-[#191B19]'
                        : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#191B19] hover:bg-white hover:border-[#191B19]'
                    }`}
                  >
                    <PwIcon name={item.icon} className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-medium leading-tight text-center text-current line-clamp-2 px-0.5">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Initial Contribution (Only when creating a new goal) */}
          {!editingGoal && (
            <div className="bg-white rounded-[24px] p-4.5 border border-[#E7EBE5] shadow-xs space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#191B19]">
                    Initial Contribution ({currency})
                  </label>
                  <span className="text-[11px] text-[#777F77]">Optional</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#777F77]">
                    {currency === 'INR' ? '₹' : currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialContribution}
                    onChange={(e) => setInitialContribution(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full h-12 pl-8 pr-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                  />
                </div>
              </div>

              {parseFloat(initialContribution) > 0 && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                    Source Account *
                  </label>
                  {accounts.length === 0 ? (
                    <p className="text-xs text-[#E5484D]">
                      Please create an account first before allocating initial funds.
                    </p>
                  ) : (
                    <select
                      value={initialSourceAccId}
                      onChange={(e) => setInitialSourceAccId(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19] focus:outline-none focus:border-[#191B19] transition-all"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Available:{' '}
                          {formatCurrency(acc.currentBalance, currency)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {editingGoal && confirmDeleteGoalId !== editingGoal.id && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteGoalId(editingGoal.id)}
                className="text-xs font-semibold text-[#E5484D] hover:underline inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Goal</span>
              </button>
            </div>
          )}
        </form>
      </MobileBottomSheet>

      {/* MANUAL CONTRIBUTION SHEET */}
      <MobileBottomSheet
        isOpen={Boolean(contributingGoal)}
        onClose={() => setContributingGoal(null)}
        title={`Contribute to ${contributingGoal?.name || 'Goal'}`}
        subtitle="Allocate funds from one of your accounts into this savings goal"
      >
        {contributingGoal && (
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            {contribError && (
              <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318]">
                {contribError}
              </div>
            )}

            <div className="p-4 rounded-[24px] bg-[#EBF0E9] border border-[#E7EBE5] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#777F77]">Current Saved</p>
                <p className="text-base font-bold text-[#191B19]">
                  {formatCurrency(contributingGoal.savedAmount, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#777F77]">Remaining to Goal</p>
                <p className="text-base font-bold text-[#191B19]">
                  {formatCurrency(
                    Math.max(
                      0,
                      contributingGoal.targetAmount - contributingGoal.savedAmount
                    ),
                    currency
                  )}
                </p>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="p-4 rounded-[24px] bg-white border border-[#E7EBE5] text-center space-y-2.5">
                <p className="text-xs font-medium text-[#191B19]">
                  You need an account with available balance to contribute.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContributingGoal(null);
                    setActiveTab('accounts');
                  }}
                  className="px-4 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold"
                >
                  Go to Accounts
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                      Contribution Amount ({currency}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={contribAmount}
                      onChange={(e) => setContribAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                      Select Source Account *
                    </label>
                    <div className="space-y-2">
                      {accounts.map((acc) => {
                        const isSelected = acc.id === contribSourceAccId;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setContribSourceAccId(acc.id)}
                            className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'bg-[#191B19] border-[#191B19] text-white'
                                : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#191B19]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PwIcon
                                name={acc.icon}
                                className={`w-4 h-4 ${
                                  isSelected ? 'text-[#DFFF52]' : 'text-[#191B19]'
                                }`}
                              />
                              <span className="text-xs font-semibold">
                                {acc.name}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                isSelected ? 'text-[#DFFF52]' : 'text-[#777F77]'
                              }`}
                            >
                              {formatCurrency(acc.currentBalance, currency)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                      Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={contribNotes}
                      onChange={(e) => setContribNotes(e.target.value)}
                      placeholder="e.g. Monthly bonus allocation"
                      className="w-full px-3.5 py-2 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isContributing}
                  className="w-full py-4 rounded-full bg-[#191B19] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isContributing ? (
                    <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
                  ) : (
                    <Check className="w-4 h-4 text-[#DFFF52]" />
                  )}
                  <span>
                    {isContributing ? 'Processing Contribution...' : 'Confirm Contribution'}
                  </span>
                </button>
              </>
            )}
          </form>
        )}
      </MobileBottomSheet>

      {/* AUTOMATED RECURRING CONTRIBUTIONS SHEET */}
      <MobileBottomSheet
        isOpen={Boolean(automatingGoal)}
        onClose={() => setAutomatingGoal(null)}
        title={`Automated Savings: ${automatingGoal?.name || ''}`}
        subtitle="Schedule recurring internal allocations within Pennywise"
      >
        {automatingGoal && (
          <form onSubmit={handleSaveRecurringSubmit} className="space-y-4">
            {/* Important Disclaimer per Prompt Specification */}
            <div className="p-3.5 rounded-2xl bg-[#EBF0E9] border border-[#D8DFD4] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#191B19] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#191B19]/85 leading-relaxed">
                <strong>Internal Savings Allocation:</strong> Automated contributions allocate available funds within your Pennywise account balances. They do not execute external bank transfers or debit real bank accounts.
              </p>
            </div>

            {recError && (
              <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318]">
                {recError}
              </div>
            )}

            <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-3.5">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E7EBE5]">
                <div>
                  <p className="text-xs font-semibold text-[#191B19]">
                    Enable Automated Contributions
                  </p>
                  <p className="text-[10px] text-[#777F77]">
                    Idempotent processing prevents duplicate allocations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRecEnabled(!recEnabled)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    recEnabled
                      ? 'bg-[#DFFF52] text-[#191B19]'
                      : 'bg-[#EBF0E9] text-[#777F77]'
                  }`}
                >
                  {recEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="3000"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                    Frequency *
                  </label>
                  <select
                    value={recFrequency}
                    onChange={(e) =>
                      setRecFrequency(e.target.value as RecurringFrequency)
                    }
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Starting Date *
                </label>
                <input
                  type="date"
                  required
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Source Account *
                </label>
                <select
                  value={recSourceAccId}
                  onChange={(e) => setRecSourceAccId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {recurringRules.some((r) => r.goalId === automatingGoal.id) && (
                <button
                  type="button"
                  onClick={async () => {
                    const rule = recurringRules.find(
                      (r) => r.goalId === automatingGoal.id
                    );
                    if (rule) {
                      await deleteRecurringContribution(rule.id);
                      setAutomatingGoal(null);
                    }
                  }}
                  className="px-4 py-3.5 rounded-full bg-white border border-[#F5C2C7] text-[#E5484D] text-xs font-semibold"
                >
                  Remove Rule
                </button>
              )}

              <button
                type="submit"
                disabled={isSavingRecurring}
                className="flex-1 py-3.5 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingRecurring ? (
                  <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
                ) : (
                  <Check className="w-4 h-4 text-[#DFFF52]" />
                )}
                <span>
                  {isSavingRecurring ? 'Saving Schedule...' : 'Save Automated Schedule'}
                </span>
              </button>
            </div>
          </form>
        )}
      </MobileBottomSheet>

      {/* CONTRIBUTION HISTORY SHEET */}
      <MobileBottomSheet
        isOpen={Boolean(inspectingGoal)}
        onClose={() => setInspectingGoal(null)}
        title={`${inspectingGoal?.name || 'Goal'} Contributions`}
        subtitle="Complete log of manual and automated allocations"
      >
        {inspectingGoal && (
          <div className="space-y-3">
            {contributions.filter((c) => c.goalId === inspectingGoal.id)
              .length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-[#E7EBE5] text-center">
                <p className="text-xs text-[#777F77]">
                  No contributions recorded for this goal yet.
                </p>
              </div>
            ) : (
              contributions
                .filter((c) => c.goalId === inspectingGoal.id)
                .map((c) => {
                  const acc = accounts.find((a) => a.id === c.sourceAccountId);
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#191B19]">
                          {acc?.name || 'Source Account'}
                        </p>
                        <p className="text-[10px] text-[#777F77] mt-0.5">
                          {c.contributionDate}
                          {c.notes ? ` · ${c.notes}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#2E7D32]">
                        +{formatCurrency(c.amount, currency)}
                      </span>
                    </div>
                  );
                })
            )}

            <button
              type="button"
              disabled={isProcessingDue}
              onClick={async () => {
                if (isProcessingDue) return;
                setIsProcessingDue(true);
                try {
                  await processDueRecurringContributions();
                } finally {
                  setIsProcessingDue(false);
                }
              }}
              className="w-full py-3 rounded-full bg-[#EBF0E9] text-[#191B19] text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isProcessingDue ? (
                <PwSpinner className="w-3.5 h-3.5 text-[#191B19]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>
                {isProcessingDue
                  ? 'Checking Scheduled Allocations...'
                  : 'Check & Process Any Due Scheduled Allocations'}
              </span>
            </button>
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
}

