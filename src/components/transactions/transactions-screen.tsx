'use client';

import React, { useMemo, useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import { EXPENSE_CATEGORIES, Transaction } from '@/types/pennywise';
import { getCategoryMeta } from '@/lib/categories';
import { formatCurrency, formatMonthLabel } from '@/lib/money';
import {
  CategoryDonutChart,
  MonthlySpendingAreaChart,
  PreviousMonthComparisonChart,
} from '@/components/charts/pennywise-charts';
import { TransactionDetailSheet } from './transaction-detail-sheet';
import { CardListSkeleton, ChartCardSkeleton, PwIcon } from '@/components/ui/pw-icon';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

export function TransactionsScreen() {
  const {
    user,
    isDataLoading,
    accounts,
    transactions,
    selectedMonth,
    setSelectedMonth,
    monthlyAnalytics,
    transactionFilters,
    setTransactionFilters,
    openAddFlow,
  } = usePennywise();

  const currency = user?.currency || 'INR';
  const [subTab, setSubTab] = useState<'history' | 'analytics'>('history');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Month navigation helper
  function shiftMonth(delta: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const nextKey = d.toISOString().slice(0, 7);
    setSelectedMonth(nextKey);
    if (transactionFilters.month !== 'all') {
      setTransactionFilters((prev) => ({ ...prev, month: nextKey }));
    }
  }

  // Distinct available months from transactions + current selectedMonth
  const availableMonths = useMemo(() => {
    const set = new Set<string>([
      new Date().toISOString().slice(0, 7),
      selectedMonth,
    ]);
    for (const tx of transactions) {
      set.add(tx.transactionDate.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, selectedMonth]);

  // Filtered chronological transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (
        transactionFilters.month !== 'all' &&
        tx.transactionDate.slice(0, 7) !== transactionFilters.month
      ) {
        return false;
      }
      if (
        transactionFilters.category !== 'all' &&
        tx.category !== transactionFilters.category
      ) {
        return false;
      }
      if (
        transactionFilters.accountId !== 'all' &&
        tx.accountId !== transactionFilters.accountId
      ) {
        return false;
      }
      if (transactionFilters.search.trim()) {
        const q = transactionFilters.search.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchNotes) return false;
      }
      return true;
    });
  }, [transactions, transactionFilters]);

  const activeFilterCount =
    (transactionFilters.month !== 'all' ? 1 : 0) +
    (transactionFilters.category !== 'all' ? 1 : 0) +
    (transactionFilters.accountId !== 'all' ? 1 : 0) +
    (transactionFilters.search.trim() ? 1 : 0);

  return (
    <div className="space-y-4 pb-6">
      {/* Editorial Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DFFF52] text-[#191B19] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#191B19]">
              Spending &amp; Activity
            </h1>
            <p className="text-xs text-[#777F77] mt-0.5">
              Chronological history &amp; real-time analytics
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openAddFlow('chooser')}
          className="px-3.5 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#DFFF52]" />
          <span>Add</span>
        </button>
      </div>

      {/* Month Selector Bar + Sub-view Switcher */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 bg-white rounded-full p-1 border border-[#E7EBE5] shadow-pw-card">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-7 h-7 rounded-full hover:bg-[#EBF0E9] flex items-center justify-center text-[#191B19]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-semibold text-[#191B19] min-w-[92px] text-center">
            {formatMonthLabel(selectedMonth, true)}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-7 h-7 rounded-full hover:bg-[#EBF0E9] flex items-center justify-center text-[#191B19]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pill Tabs inspired by Reference Image */}
        <div className="inline-flex items-center gap-1.5 bg-[#EBF0E9] p-1 rounded-full border border-[#E7EBE5]">
          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subTab === 'history'
                ? 'bg-[#191B19] text-white'
                : 'text-[#191B19] hover:bg-white/60'
            }`}
          >
            Transactions
          </button>
          <button
            type="button"
            onClick={() => setSubTab('analytics')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              subTab === 'analytics'
                ? 'bg-[#191B19] text-white'
                : 'text-[#191B19] hover:bg-white/60'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Monthly Overview Metrics Strip (Always visible) */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#EBF0E9] rounded-[22px] p-3 border border-[#E7EBE5]">
          <span className="text-[10px] font-medium text-[#777F77] block">
            Month Spend
          </span>
          <span className="text-sm font-bold text-[#191B19] mt-1 block truncate">
            {formatCurrency(monthlyAnalytics.totalExpenses, currency, {
              compact: true,
            })}
          </span>
        </div>

        <div className="bg-white rounded-[22px] p-3 border border-[#E7EBE5]">
          <span className="text-[10px] font-medium text-[#777F77] block">
            Month Income
          </span>
          <span className="text-sm font-bold text-[#2E7D32] mt-1 block truncate">
            {formatCurrency(monthlyAnalytics.totalIncome, currency, {
              compact: true,
            })}
          </span>
        </div>

        <div className="bg-[#DFFF52] rounded-[22px] p-3 border border-[#CBEB3B]">
          <span className="text-[10px] font-medium text-[#191B19]/75 block">
            Available
          </span>
          <span className="text-sm font-bold text-[#191B19] mt-1 block truncate">
            {formatCurrency(monthlyAnalytics.totalAvailableBalance, currency, {
              compact: true,
            })}
          </span>
        </div>
      </div>

      {subTab === 'analytics' ? (
        <div key="analytics" className="space-y-4 animate-viewEnter">
          {isDataLoading ? (
            <>
              <ChartCardSkeleton heightClass="h-44" />
              <ChartCardSkeleton heightClass="h-44" />
            </>
          ) : (
            <>
              {/* B. Monthly Expense Overview — Interactive Area Chart */}
              <MonthlySpendingAreaChart
                dailySeries={monthlyAnalytics.dailySeries}
                totalExpenses={monthlyAnalytics.totalExpenses}
                monthLabel={monthlyAnalytics.monthLabel}
                currency={currency}
              />

              {/* C. Category Analytics — Interactive Pie / Donut Chart */}
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
                  setSubTab('history');
                }}
              />

              {/* D. Previous Month Comparison — Area Chart */}
              <PreviousMonthComparisonChart
                analytics={monthlyAnalytics}
                currency={currency}
              />
            </>
          )}
        </div>
      ) : (
        <div key="history" className="space-y-3.5 animate-viewEnter">
          {/* E. Mobile-Friendly Filtering (Month, Category, Account, Search) */}
          <div className="bg-white rounded-[24px] p-3.5 border border-[#E7EBE5] shadow-pw-card space-y-2.5">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={transactionFilters.search}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder="Search merchant, title, or category..."
                className="w-full pl-9 pr-8 py-2 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19] placeholder:text-[#9FA69F] focus:outline-none focus:border-[#191B19]"
              />
              {transactionFilters.search && (
                <button
                  type="button"
                  onClick={() =>
                    setTransactionFilters((prev) => ({ ...prev, search: '' }))
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777F77]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown Pills */}
            <div className="grid grid-cols-3 gap-2">
              <select
                aria-label="Filter by Month"
                value={transactionFilters.month}
                onChange={(e) => {
                  const val = e.target.value;
                  setTransactionFilters((prev) => ({ ...prev, month: val }));
                  if (val !== 'all') setSelectedMonth(val);
                }}
                className="px-2.5 py-2 rounded-xl bg-[#F5F7F3] border border-[#E7EBE5] text-[11px] font-semibold text-[#191B19] truncate"
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m, true)}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Category"
                value={transactionFilters.category}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-2.5 py-2 rounded-xl bg-[#F5F7F3] border border-[#E7EBE5] text-[11px] font-semibold text-[#191B19] truncate"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Account"
                value={transactionFilters.accountId}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                className="px-2.5 py-2 rounded-xl bg-[#F5F7F3] border border-[#E7EBE5] text-[11px] font-semibold text-[#191B19] truncate"
              >
                <option value="all">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-[#777F77]">
                  Showing {filteredTransactions.length} matching record(s)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTransactionFilters({
                      month: 'all',
                      category: 'all',
                      accountId: 'all',
                      search: '',
                    })
                  }
                  className="text-[11px] font-semibold text-[#191B19] underline"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Chronological Transaction List */}
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-[28px] p-7 border border-[#E7EBE5] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF0E9] mx-auto flex items-center justify-center text-[#191B19]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#191B19]">
                  {transactions.length === 0
                    ? 'No transactions recorded yet'
                    : 'No transactions match your filters'}
                </h3>
                <p className="text-xs text-[#777F77] mt-1 max-w-[250px] mx-auto">
                  {transactions.length === 0
                    ? 'Scan a receipt with AI or add an expense manually to start tracking your spending.'
                    : 'Try clearing one of the active filters above.'}
                </p>
              </div>
              {transactions.length === 0 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openAddFlow('scan')}
                    className="px-4 py-2.5 rounded-full bg-[#DFFF52] text-[#191B19] text-xs font-semibold"
                  >
                    Scan Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddFlow('manual')}
                    className="px-4 py-2.5 rounded-full bg-[#191B19] text-white text-xs font-semibold"
                  >
                    Add Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => {
                const meta = getCategoryMeta(tx.category);
                const acc = accounts.find((a) => a.id === tx.accountId);
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="w-full p-3.5 rounded-[24px] bg-white border border-[#E7EBE5] shadow-pw-card flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: meta.bgSoft,
                          color: meta.textColor,
                        }}
                      >
                        <PwIcon name={meta.icon} className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-[#191B19] truncate">
                            {tx.title}
                          </p>
                          {tx.receiptId && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#DFFF52] text-[#191B19] text-[9px] font-bold shrink-0">
                              OCR
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#777F77] truncate mt-0.5">
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
        </div>
      )}

      {/* Transaction Detail / Edit / Delete Sheet */}
      <TransactionDetailSheet
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}

