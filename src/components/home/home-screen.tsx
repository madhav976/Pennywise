'use client';

import React, { useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import { getCategoryMeta } from '@/lib/categories';
import {
  calculateGoalMetrics,
  formatCurrency,
  formatMonthLabel,
} from '@/lib/money';
import { AccountType, Transaction } from '@/types/pennywise';
import {
  CategoryDonutChart,
  MonthlySpendingAreaChart,
  PreviousMonthComparisonChart,
} from '@/components/charts/pennywise-charts';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import {
  ChartCardSkeleton,
  MobileBottomSheet,
  PercentagePillBadge,
  PwIcon,
  PwSpinner,
  SegmentedCapsuleBar,
} from '@/components/ui/pw-icon';
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';

export function HomeScreen() {
  const {
    user,
    isDataLoading,
    isSupabaseConnected,
    accounts,
    transactions,
    goals,
    selectedMonth,
    setSelectedMonth,
    monthlyAnalytics,
    setActiveTab,
    openAddFlow,
    createAccount,
    updateProfile,
    signOut,
    setTransactionFilters,
  } = usePennywise();

  const currency = user?.currency || 'INR';

  // Progressive disclosure chart tab on Home Screen
  const [chartTab, setChartTab] = useState<'trend' | 'comparison' | 'categories'>(
    'trend'
  );
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings form state
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileCurrency, setProfileCurrency] = useState(currency);

  // Onboarding first-account form state (for new users with 0 accounts)
  const [onboardAccName, setOnboardAccName] = useState('Salary Account');
  const [onboardAccType, setOnboardAccType] = useState<AccountType>('salary');
  const [onboardAccBalance, setOnboardAccBalance] = useState('');
  const [onboardAccIncome, setOnboardAccIncome] = useState('');
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [isCreatingAcc, setIsCreatingAcc] = useState(false);

  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setSelectedMonth(d.toISOString().slice(0, 7));
  }

  async function handleOnboardingCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setOnboardError(null);
    const bal = parseFloat(onboardAccBalance || '0');
    if (!onboardAccName.trim() || isNaN(bal) || bal < 0) {
      setOnboardError('Please enter a valid account name and opening balance.');
      return;
    }

    const incomeVal = onboardAccIncome.trim() ? parseFloat(onboardAccIncome) : undefined;
    if (
      onboardAccType === 'salary' &&
      incomeVal !== undefined &&
      (isNaN(incomeVal) || incomeVal < 0)
    ) {
      setOnboardError('Please enter a valid monthly income (0 or greater).');
      return;
    }

    setIsCreatingAcc(true);
    try {
      const iconMap: Record<AccountType, string> = {
        salary: 'Landmark',
        savings: 'PiggyBank',
        cash: 'Wallet',
        personal: 'CreditCard',
        credit: 'Smartphone',
        custom: 'Briefcase',
      };
      const res = await createAccount({
        name: onboardAccName.trim(),
        accountType: onboardAccType,
        openingBalance: bal,
        monthlyIncome: onboardAccType === 'salary' ? incomeVal : undefined,
        icon: iconMap[onboardAccType] || 'Landmark',
      });
      if (!res.ok) {
        setOnboardError(res.error || 'Could not create account.');
      }
    } finally {
      setIsCreatingAcc(false);
    }
  }

  const recentTransactions = transactions.slice(0, 5);
  const displayName =
    user?.fullName?.trim() || user?.email?.split('@')[0] || 'My Workspace';

  return (
    <div className="space-y-4 pb-6">
      {/* 1. HEADER: User Name Greeting & Profile/Settings */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#191B19] flex items-center justify-center text-[#DFFF52] shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[#191B19] leading-tight">
              {displayName}
            </h2>
            <p className="text-xs text-[#777F77]">Good to see you</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAddFlow('scan')}
            className="px-3 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Camera className="w-3.5 h-3.5 text-[#DFFF52]" />
            <span>Scan Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileName(user?.fullName || '');
              setProfileCurrency(user?.currency || 'INR');
              setIsSettingsOpen(true);
            }}
            aria-label="Open profile and settings"
            className="w-10 h-10 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19] shadow-pw-card active:scale-95 transition-transform"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Brand Dashboard Title */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#191B19]">
          PennyWise
        </h1>

        {/* Compact Month Switcher */}
        <div className="inline-flex items-center gap-0.5 bg-white rounded-full p-1 border border-[#E7EBE5] shadow-pw-card shrink-0">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-6 h-6 rounded-full hover:bg-[#EBF0E9] flex items-center justify-center text-[#191B19] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[11px] font-semibold text-[#191B19]">
            {formatMonthLabel(selectedMonth, true)}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-6 h-6 rounded-full hover:bg-[#EBF0E9] flex items-center justify-center text-[#191B19] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. PREMIUM ONBOARDING FOR NEW USERS (When 0 Accounts Exist) */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-[28px] p-6 border border-[#E7EBE5] shadow-pw-card space-y-5 animate-fadeIn">
          {/* Header & Step Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0E9] border border-[#E7EBE5] text-[11px] font-semibold text-[#191B19]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                Step 1 · Welcome Onboarding
              </span>
              <span className="text-[11px] font-medium text-[#777F77]">Quick Setup</span>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#191B19]">
                Set up your first account
              </h2>
              <p className="text-xs text-[#777F77] mt-1 leading-relaxed">
                Pennywise links all your expenses, transactions, and savings to real accounts. Choose a starting account type below:
              </p>
            </div>
          </div>

          {/* Account Type Selection Chips */}
          <div>
            <label className="block text-[11px] font-medium text-[#777F77] mb-2">
              Select Account Type
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: 'Salary Account', type: 'salary' as AccountType },
                { label: 'Savings Account', type: 'savings' as AccountType },
                { label: 'Cash Wallet', type: 'cash' as AccountType },
                { label: 'Personal Account', type: 'personal' as AccountType },
              ].map((item) => {
                const active = onboardAccType === item.type;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setOnboardAccName(item.label);
                      setOnboardAccType(item.type);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                      active
                        ? 'bg-[#191B19] text-white border border-[#191B19] shadow-xs'
                        : 'bg-[#F5F7F3] hover:bg-white text-[#191B19] border border-[#E7EBE5]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleOnboardingCreateAccount} className="space-y-4">
            {onboardError && (
              <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D] shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={onboardAccName}
                  onChange={(e) => setOnboardAccName(e.target.value)}
                  placeholder="e.g. Primary Salary Account"
                  className="w-full h-12 px-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-medium text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Opening Balance ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#777F77]">
                    {currency === 'INR' ? '₹' : currency}
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={onboardAccBalance}
                    onChange={(e) => setOnboardAccBalance(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full h-12 pl-9 pr-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                  />
                </div>
              </div>

              {/* Monthly Income field for Salary Accounts */}
              {onboardAccType === 'salary' && (
                <div className="pt-0.5 animate-fadeIn">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#191B19]">
                      Monthly Income ({currency})
                    </label>
                    <span className="text-[11px] text-[#777F77]">Optional</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#777F77]">
                      {currency === 'INR' ? '₹' : currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={onboardAccIncome}
                      onChange={(e) => setOnboardAccIncome(e.target.value)}
                      placeholder="e.g. 75000"
                      className="w-full h-12 pl-9 pr-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#777F77] mt-1">
                    Recorded as your regular salary for analytics; does not alter opening balance.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreatingAcc}
              className="w-full h-12 rounded-full bg-[#191B19] hover:bg-[#252825] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isCreatingAcc ? (
                <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-[#DFFF52]" />
              )}
              <span>
                {isCreatingAcc
                  ? 'Setting Up Account...'
                  : 'Create First Account & Start Tracking'}
              </span>
            </button>
          </form>
        </div>
      ) : (
        /* FINANCIAL OVERVIEW CARDS (Styled after the Reference Image's Pale Sage & Neon Lime Cards) */
        <div className="space-y-3">
          {/* Primary Available Balance Card */}
          <div className="bg-[#EBF0E9] rounded-[28px] p-5 border border-[#E7EBE5] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19]">
                  <PwIcon name="Landmark" className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#191B19]">
                  Total Available Balance
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E7EBE5] text-[11px] font-semibold text-[#191B19] inline-flex items-center gap-1"
              >
                <span>{accounts.length} Acc</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <span className="text-3xl font-normal tracking-tight text-[#191B19]">
                {formatCurrency(
                  monthlyAnalytics.totalAvailableBalance,
                  currency
                )}
              </span>
              {monthlyAnalytics.totalIncome > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-white text-[#2E7D32] text-[11px] font-semibold border border-[#E7EBE5]">
                  +{formatCurrency(monthlyAnalytics.totalIncome, currency, {
                    compact: true,
                  })}{' '}
                  income
                </span>
              )}
            </div>

            {/* Dual Metric Cards: Monthly Expenses & Monthly Income / Comparison */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-[#DFFF52] rounded-[22px] p-3.5 border border-[#CBEB3B]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#191B19]">
                    Monthly Expenses
                  </span>
                  <PwIcon
                    name="ArrowUpRight"
                    className="w-3.5 h-3.5 text-[#191B19]"
                  />
                </div>
                <p className="text-lg font-bold text-[#191B19] mt-1.5 truncate">
                  {formatCurrency(monthlyAnalytics.totalExpenses, currency)}
                </p>
                <p className="text-[10px] text-[#191B19]/75 mt-0.5">
                  {monthlyAnalytics.monthLabel}
                </p>
              </div>

              <div className="bg-[#202320] text-white rounded-[22px] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/80">
                    {monthlyAnalytics.totalIncome > 0
                      ? 'Monthly Income'
                      : 'Saved in Goals'}
                  </span>
                  <PwIcon
                    name="Sparkles"
                    className="w-3.5 h-3.5 text-[#DFFF52]"
                  />
                </div>
                <p className="text-lg font-bold text-white mt-1.5 truncate">
                  {formatCurrency(
                    monthlyAnalytics.totalIncome > 0
                      ? monthlyAnalytics.totalIncome
                      : monthlyAnalytics.totalSavedInGoals,
                    currency
                  )}
                </p>
                <p className="text-[10px] text-[#B9D99B] mt-0.5">
                  {monthlyAnalytics.totalIncome > 0
                    ? `Active inflow`
                    : `${goals.length} active goal(s)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SPENDING ANALYTICS (With Pill Switcher for Progressive Disclosure) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#191B19]">
            Spending Analytics
          </h2>
          {/* Horizontal Pill Tabs */}
          <div className="inline-flex items-center gap-1 bg-[#EBF0E9] p-1 rounded-full border border-[#E7EBE5]">
            {[
              { id: 'trend' as const, label: 'Area Trend' },
              { id: 'comparison' as const, label: 'vs Prev' },
              { id: 'categories' as const, label: 'Categories' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartTab(tab.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  chartTab === tab.id
                    ? 'bg-[#191B19] text-white'
                    : 'text-[#191B19]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isDataLoading ? (
          <ChartCardSkeleton heightClass="h-48" />
        ) : (
          <div key={chartTab} className="animate-viewEnter">
            {chartTab === 'trend' && (
              <MonthlySpendingAreaChart
                dailySeries={monthlyAnalytics.dailySeries}
                totalExpenses={monthlyAnalytics.totalExpenses}
                monthLabel={monthlyAnalytics.monthLabel}
                currency={currency}
              />
            )}

            {chartTab === 'comparison' && (
              <PreviousMonthComparisonChart
                analytics={monthlyAnalytics}
                currency={currency}
              />
            )}

            {chartTab === 'categories' && (
              <CategoryDonutChart
                breakdown={monthlyAnalytics.categoryBreakdown}
                totalExpenses={monthlyAnalytics.totalExpenses}
                monthLabel={monthlyAnalytics.monthLabel}
                currency={currency}
                onSelectCategoryFilter={(cat) => {
                  setTransactionFilters({
                    month: selectedMonth,
                    category: cat,
                    accountId: 'all',
                    search: '',
                  });
                  setActiveTab('transactions');
                }}
              />
            )}
          </div>
        )}
      </section>

      {/* 4. SAVINGS GOALS PREVIEW */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#191B19]">Savings Goals</h2>
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className="text-xs font-semibold text-[#191B19] inline-flex items-center gap-1"
          >
            <span>{goals.length > 0 ? 'Manage All' : 'Create Goal'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF0E9] flex items-center justify-center text-[#191B19] shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#191B19]">
                  No active savings goals
                </p>
                <p className="text-[11px] text-[#777F77]">
                  Save toward a phone, laptop, or trip
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('goals')}
              className="px-3.5 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold shrink-0"
            >
              + Goal
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {goals.slice(0, 2).map((goal) => {
              const metrics = calculateGoalMetrics(goal);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className="w-full text-left bg-white rounded-[26px] p-4 border border-[#E7EBE5] shadow-pw-card space-y-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-[#EBF0E9] flex items-center justify-center text-[#191B19]">
                        <PwIcon name={goal.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#191B19]">
                          {goal.name}
                        </p>
                        <p className="text-[11px] text-[#777F77]">
                          {formatCurrency(metrics.savedAmount, currency)} /{' '}
                          {formatCurrency(metrics.targetAmount, currency)}
                        </p>
                      </div>
                    </div>
                    <PercentagePillBadge
                      percentage={metrics.percentage}
                      variant="lime"
                    />
                  </div>
                  <SegmentedCapsuleBar
                    percentage={metrics.percentage}
                    segments={8}
                    activeColor="charcoal"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. RECENT TRANSACTIONS */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#191B19]">
            Recent Transactions
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-semibold text-[#191B19] inline-flex items-center gap-1"
          >
            <span>See All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-white rounded-[24px] p-5 border border-[#E7EBE5] text-center space-y-3">
            <p className="text-xs font-medium text-[#191B19]">
              No expenses recorded yet
            </p>
            <p className="text-[11px] text-[#777F77]">
              Scan a receipt or add an expense manually to see your activity here.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openAddFlow('scan')}
                className="px-4 py-2 rounded-full bg-[#DFFF52] text-[#191B19] text-xs font-semibold"
              >
                Scan Receipt
              </button>
              <button
                type="button"
                onClick={() => openAddFlow('manual')}
                className="px-4 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold"
              >
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const meta = getCategoryMeta(tx.category);
              const acc = accounts.find((a) => a.id === tx.accountId);
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTx(tx)}
                  className="w-full p-3.5 rounded-[22px] bg-white border border-[#E7EBE5] shadow-pw-card flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: meta.bgSoft,
                        color: meta.textColor,
                      }}
                    >
                      <PwIcon name={meta.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#191B19] truncate">
                        {tx.title}
                      </p>
                      <p className="text-[10px] text-[#777F77] truncate mt-0.5">
                        {tx.category} · {acc?.name || 'Account'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-bold ${
                        tx.transactionType === 'income'
                          ? 'text-[#2E7D32]'
                          : 'text-[#191B19]'
                      }`}
                    >
                      {tx.transactionType === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </p>
                    <p className="text-[10px] text-[#777F77] mt-0.5">
                      {tx.transactionDate}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Transaction Detail / Edit / Delete Sheet */}
      <TransactionDetailSheet
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />

      {/* Profile & Settings Sheet */}
      <MobileBottomSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Profile & Preferences"
        subtitle={user?.email || 'Authenticated Account'}
        footer={
          <button
            type="button"
            onClick={() => {
              updateProfile({
                fullName: profileName,
                currency: profileCurrency,
              });
              setIsSettingsOpen(false);
            }}
            className="w-full h-12 rounded-full bg-[#191B19] hover:bg-[#252825] text-[#DFFF52] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 text-[#DFFF52]" />
            <span>Save Preferences</span>
          </button>
        }
      >
        <div className="space-y-3.5">
          {/* User Profile Header Card */}
          <div className="bg-white rounded-[24px] p-4.5 border border-[#E7EBE5] shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#191B19] text-[#DFFF52] flex items-center justify-center text-base font-bold shrink-0 shadow-xs">
                {(user?.fullName || user?.email || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#191B19] truncate">
                    {user?.fullName || 'Pennywise Member'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF0E9] text-[10px] font-semibold text-[#191B19] shrink-0">
                    Pro
                  </span>
                </div>
                <p className="text-xs text-[#777F77] truncate mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="bg-white rounded-[24px] p-4.5 border border-[#E7EBE5] shadow-xs space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-12 px-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-medium text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                Preferred Currency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { code: 'INR', symbol: '₹' },
                  { code: 'USD', symbol: '$' },
                  { code: 'EUR', symbol: '€' },
                  { code: 'GBP', symbol: '£' },
                ].map(({ code, symbol }) => {
                  const active = profileCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setProfileCurrency(code)}
                      className={`h-11 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center transition-all active:scale-95 ${
                        active
                          ? 'bg-[#191B19] border-[#191B19] text-[#DFFF52] shadow-xs'
                          : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#777F77] hover:border-[#191B19] hover:bg-white'
                      }`}
                    >
                      <span>{code}</span>
                      <span className="text-[10px] opacity-75 font-normal">{symbol}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Backend Sync Information */}
          <div className="p-4 rounded-[24px] bg-white border border-[#E7EBE5] shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  isSupabaseConnected
                    ? 'bg-[#2E7D32] ring-4 ring-[#EBF0E9]'
                    : 'bg-[#F59E0B] ring-4 ring-[#FEF3C7]'
                }`}
              />
              <div>
                <p className="font-semibold text-[#191B19]">
                  {isSupabaseConnected ? 'Cloud Sync Active' : 'Local Encrypted Mode'}
                </p>
                <p className="text-[11px] text-[#777F77] mt-0.5">
                  {isSupabaseConnected
                    ? 'Supabase PostgreSQL · Multi-User RLS Enforced'
                    : 'Local encrypted ledger'}
                </p>
              </div>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={async () => {
              setIsSettingsOpen(false);
              await signOut();
            }}
            className="w-full h-12 rounded-full bg-white border border-[#F5C2C7] text-[#E5484D] hover:bg-[#FFEFEF] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Securely</span>
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
}

