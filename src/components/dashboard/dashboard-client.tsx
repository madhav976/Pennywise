'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { CreditCardPresentation } from './credit-card-presentation';
import { MonthlyMetricCard } from './monthly-metric-card';
import { StatisticCard } from './statistic-card';
import { ProfileCard } from './profile-card';
import { RecentTransactionsCard } from './recent-transactions-card';
import {
  FinancialStatisticsChart,
  MonthlyExpenseBarChart,
  MonthlyIncomeAreaChart,
} from './financial-chart-adapters';
import { SpendingBreakdownCard } from './spending-breakdown-card';
import {
  createPreviewFinancialSummary,
  type DashboardDateRange,
} from '@/modules/finance/chart-data/finance-chart-data';
import { usePulseFinance } from '@/modules/finance/store/pulse-finance-context';
import { AccountDTO, FinancialSummaryDTO, TransactionDTO } from '@/types/finance';
import { Menu, X } from 'lucide-react';

interface DashboardClientProps {
  initialSummary?: FinancialSummaryDTO | null;
  initialAccounts?: AccountDTO[];
  initialTransactions?: TransactionDTO[];
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  userCurrency?: string;
}

export function DashboardClient({
  initialSummary,
  initialAccounts = [],
  initialTransactions = [],
  userName = 'Jason Jones',
  userEmail = 'jason.jones@pulse.app',
  userAvatarUrl,
  userCurrency = 'USD',
}: DashboardClientProps) {
  const router = useRouter();
  const pulseStore = usePulseFinance();
  const effectiveAccounts =
    initialAccounts.length > 0 ? initialAccounts : pulseStore.accounts;
  const effectiveTransactions =
    initialTransactions.length > 0 ? initialTransactions : pulseStore.transactions;

  const [currentPath, setCurrentPath] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | undefined>(
    effectiveAccounts[0]?.id
  );
  const [currencyCode, setCurrencyCode] = useState<string>(
    pulseStore.currency || userCurrency || 'USD'
  );
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [expenseRange, setExpenseRange] = useState<DashboardDateRange>('month');
  const [searchQuery, setSearchQuery] = useState('');

  const currencySymbol = currencyCode === 'INR' ? '₹' : '$';

  // Use the real Supabase summary when authenticated, or the reactive PULSE store summary
  const effectiveSummary = useMemo<FinancialSummaryDTO>(
    () => initialSummary ?? pulseStore.summary ?? createPreviewFinancialSummary(),
    [initialSummary, pulseStore.summary]
  );

  // Compute dynamic period comparison percentages from cash flow series
  const { incomeDeltaLabel, isIncomePositive, expenseDeltaLabel, isExpensePositive } =
    useMemo(() => {
      const series = effectiveSummary.dailyCashFlow;
      if (series.length < 2) {
        return {
          incomeDeltaLabel: '+12.4%',
          isIncomePositive: true,
          expenseDeltaLabel: '-4.2%',
          isExpensePositive: true,
        };
      }
      const mid = Math.floor(series.length / 2);
      const firstHalfIncome = series
        .slice(0, mid)
        .reduce((acc, d) => acc + (Number(d.totalIncome) || 0), 0);
      const secondHalfIncome = series
        .slice(mid)
        .reduce((acc, d) => acc + (Number(d.totalIncome) || 0), 0);
      const incomePct =
        firstHalfIncome > 0
          ? ((secondHalfIncome - firstHalfIncome) / firstHalfIncome) * 100
          : 12.4;

      const firstHalfExpense = series
        .slice(0, mid)
        .reduce((acc, d) => acc + (Number(d.totalExpenses) || 0), 0);
      const secondHalfExpense = series
        .slice(mid)
        .reduce((acc, d) => acc + (Number(d.totalExpenses) || 0), 0);
      const expensePct =
        firstHalfExpense > 0
          ? ((secondHalfExpense - firstHalfExpense) / firstHalfExpense) * 100
          : -4.2;

      return {
        incomeDeltaLabel: `${incomePct >= 0 ? '+' : ''}${incomePct.toFixed(1)}%`,
        isIncomePositive: incomePct >= 0,
        expenseDeltaLabel: `${expensePct >= 0 ? '+' : ''}${expensePct.toFixed(1)}%`,
        isExpensePositive: expensePct <= 0,
      };
    }, [effectiveSummary]);

  // Formatted Amounts
  const totalBalanceDisplay = Number(effectiveSummary.totalAssets || 24093).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  const monthlyIncomeDisplay = `${currencySymbol} ${Number(
    effectiveSummary.totalIncome || 8293
  ).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const monthlyExpensesDisplay = `${currencySymbol} ${Number(
    effectiveSummary.totalExpenses || 305
  ).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  // Filter transactions by search query when active
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return effectiveTransactions;
    const q = searchQuery.toLowerCase();
    return effectiveTransactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.merchantName?.toLowerCase().includes(q) ||
        tx.referenceNumber?.toLowerCase().includes(q)
    );
  }, [effectiveTransactions, searchQuery]);

  const handleNavigation = (path: string) => {
    setCurrentPath(path);
    setMobileMenuOpen(false);
    if (path === 'settings') {
      setActiveModal('settings');
    } else if (path === 'profile') {
      setActiveModal('profile');
    } else if (path === 'finance') {
      router.push('/finance');
    } else if (path === 'transactions') {
      router.push('/transactions');
    } else if (path === 'budgets') {
      router.push('/budgets');
    } else if (path === 'savings') {
      router.push('/savings-goals');
    }
  };

  const displayShortName = userName.split(' ').slice(-1)[0] || userName;

  return (
    <div className="min-h-screen bg-[#111014] flex flex-col lg:flex-row text-[#F5F3FA] antialiased selection:bg-[#A99BFF] selection:text-[#111014]">
      {/* Section A: Fixed Vertical Sidebar on Desktop */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <Sidebar
          currentPath={currentPath}
          onNavigate={handleNavigation}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[224px] h-full bg-[#17151D] flex flex-col justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              currentPath={currentPath}
              onNavigate={handleNavigation}
              userName={userName}
              userEmail={userEmail}
              userAvatarUrl={userAvatarUrl}
            />
          </div>
        </div>
      )}

      {/* Main Content Area (Top Header + Center & Right Columns) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <div className="lg:hidden px-5 pt-3 flex items-center justify-between border-b border-white/[0.06] pb-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl bg-[#1C1923] border border-white/[0.08] text-[#A09BAE] hover:text-[#F5F3FA]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold tracking-[0.08em] text-base text-[#F5F3FA]">
            PULSE
          </span>
          <div className="w-9" />
        </div>

        {/* Top Header */}
        <TopHeader
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onSearch={setSearchQuery}
          onSettingsClick={() => setActiveModal('settings')}
          onLogoutClick={() => setActiveModal('logout')}
          onNotificationsClick={() => setActiveModal('notifications')}
          onProfileClick={() => setActiveModal('profile')}
        />

        {/* Three-Section Asymmetrical Desktop Dashboard Grid */}
        <main className="flex-1 px-5 sm:px-7 lg:px-8 pt-3 pb-7 max-w-[1480px] w-full mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Section B: Center Financial Dashboard (8 of 12 columns on XL) */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              {/* Top Row: Layered Financial Account Cards (Left) + Stacked Monthly Income & Expenses (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                {/* Left Sub-column: Layered Cards Presentation (Directly on Main Surface) */}
                <div className="md:col-span-6 flex flex-col justify-between">
                  <CreditCardPresentation
                    accounts={effectiveAccounts}
                    activeAccountId={activeAccountId}
                    onSelectAccount={(id) => setActiveAccountId(id)}
                    onSeeAll={() => handleNavigation('finance')}
                    userName={userName}
                    currencySymbol={currencySymbol}
                  />
                </div>

                {/* Right Sub-column: Stacked Monthly Income & Monthly Expenses Cards */}
                <div className="md:col-span-6 flex flex-col justify-between gap-4">
                  {/* B. Monthly Income Card */}
                  <MonthlyMetricCard
                    title="Your Income"
                    periodLabel="Current month"
                    formattedAmount={monthlyIncomeDisplay}
                    percentageChange={incomeDeltaLabel}
                    isPositiveChange={isIncomePositive}
                    chartType="mini-line"
                    onOpenDetails={() => handleNavigation('finance')}
                    chartSlot={
                      <MonthlyIncomeAreaChart
                        currency={currencyCode}
                        dailyCashFlow={effectiveSummary.dailyCashFlow}
                      />
                    }
                  />

                  {/* C. Monthly Expenses Card */}
                  <MonthlyMetricCard
                    title="Your Expenses"
                    periodLabel={
                      expenseRange === 'month'
                        ? 'Current month'
                        : expenseRange === 'week'
                          ? 'Current week'
                          : 'Today'
                    }
                    formattedAmount={monthlyExpensesDisplay}
                    percentageChange={expenseDeltaLabel}
                    isPositiveChange={isExpensePositive}
                    chartType="mini-bar"
                    onOpenDetails={() => handleNavigation('transactions')}
                    chartControls={
                      <div
                        className="inline-flex rounded-full bg-[#24202F] border border-white/[0.06] p-0.5"
                        role="group"
                        aria-label="Expense date range"
                      >
                        {(['day', 'week', 'month'] as DashboardDateRange[]).map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setExpenseRange(range)}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                              expenseRange === range
                                ? 'bg-[#A99BFF] text-[#111014]'
                                : 'text-[#A09BAE] hover:text-[#F5F3FA]'
                            }`}
                          >
                            {range.slice(0, 1)}
                          </button>
                        ))}
                      </div>
                    }
                    chartSlot={
                      <MonthlyExpenseBarChart
                        currency={currencyCode}
                        dailyExpenditure={effectiveSummary.dailyExpenditure}
                        range={expenseRange}
                      />
                    }
                  />
                </div>
              </div>

              {/* Lower-Left Section: F. Main Financial Statistics Card */}
              <StatisticCard
                renderChart={(filters) => (
                  <FinancialStatisticsChart
                    currency={currencyCode}
                    dailyCashFlow={effectiveSummary.dailyCashFlow}
                    filters={filters}
                  />
                )}
              />
            </div>

            {/* Section C: Right Panel – Profile, Recent Transactions & Financial Overview (4 of 12 columns on XL) */}
            <div className="xl:col-span-4 flex flex-col justify-between gap-5">
              {/* D. Profile and Total Balance Card */}
              <ProfileCard
                userName={displayShortName}
                avatarUrl={userAvatarUrl}
                totalBalance={totalBalanceDisplay}
                currencySymbol={currencySymbol}
                onOpenProfile={() => setActiveModal('profile')}
              />

              {/* E. Recent Transactions Section */}
              <RecentTransactionsCard
                transactions={filteredTransactions}
                currencySymbol={currencySymbol}
                onSeeAll={() => handleNavigation('transactions')}
                onTransactionClick={(txId) => setActiveModal(`tx:${txId}`)}
              />

              {/* G. Financial Overview (Donut / Pie Chart Breakdown) */}
              <SpendingBreakdownCard
                categoryExpenditure={effectiveSummary.categoryExpenditure}
                currency={currencyCode}
                onSwitchAccount={() => setActiveModal('switch-account')}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modal Overlay for Settings, Profile & Account Switching */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'settings' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Preferences</h3>
                <p className="text-xs text-[#A09BAE] mb-4">
                  Configure your display currency and reporting preferences.
                </p>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#211E2A] border border-white/[0.06]">
                  <span className="text-xs font-medium text-[#F5F3FA]">Display Currency</span>
                  <button
                    type="button"
                    onClick={() => setCurrencyCode((c) => (c === 'USD' ? 'INR' : 'USD'))}
                    className="px-3 py-1 rounded-full bg-[#A99BFF]/20 text-[#A99BFF] text-xs font-semibold hover:bg-[#A99BFF]/30 transition-colors"
                  >
                    {currencyCode === 'USD' ? 'USD ($)' : 'INR (₹)'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'profile' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Financial Profile</h3>
                <p className="text-xs text-[#A09BAE] mb-4">{userEmail}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Account Holder</span>
                    <span className="font-semibold text-[#F5F3FA]">{userName}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Total Assets</span>
                    <span className="font-semibold text-[#65D6A1]">
                      {currencySymbol} {totalBalanceDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Net Cash Flow</span>
                    <span className="font-semibold text-[#A99BFF]">
                      {currencySymbol}{' '}
                      {Number(effectiveSummary.netCashFlow || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'switch-account' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Switch Account</h3>
                <p className="text-xs text-[#A09BAE] mb-4">
                  Select an active financial account to focus on.
                </p>
                <div className="space-y-2">
                  {(initialAccounts.length > 0
                    ? initialAccounts.map((a) => ({ id: a.id, label: `${a.accountName} (${a.currency})` }))
                    : [
                        { id: 'default-1', label: 'K Bank Platinum (Primary)' },
                        { id: 'default-2', label: 'PULSE High-Yield Savings' },
                        { id: 'default-3', label: 'Cash & Digital Wallet' },
                      ]
                  ).map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setActiveAccountId(acc.id);
                        setActiveModal(null);
                      }}
                      className="w-full text-left p-3 rounded-2xl bg-[#211E2A] hover:bg-[#292535] border border-white/[0.06] text-xs font-medium text-[#F5F3FA] transition-colors"
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeModal === 'notifications' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Notifications</h3>
                <p className="text-xs text-[#A09BAE]">
                  All ledger balances and recurring schedules are reconciled and up to date.
                </p>
              </div>
            )}

            {activeModal === 'logout' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Session Status</h3>
                <p className="text-xs text-[#A09BAE] mb-4">
                  You are currently viewing the PULSE dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#211E2A] hover:bg-[#292535] text-xs font-semibold text-[#F5F3FA] transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}

            {activeModal?.startsWith('tx:') && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Transaction Details</h3>
                <p className="text-xs text-[#A09BAE]">
                  Reference ID: <span className="font-mono text-[#F5F3FA]">{activeModal.slice(3)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
