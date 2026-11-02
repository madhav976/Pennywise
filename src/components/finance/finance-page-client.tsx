'use client';

import React, { useMemo, useState } from 'react';
import { curveMonotoneX } from 'd3-shape';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  PieCenter,
  PieChart,
  PieSlice,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
  XAxis,
} from '@/components/charts';
import { AppShell } from '@/components/layout/app-shell';
import { BorderGlow } from '@/components/ui/border-glow';
import { usePulseFinance } from '@/modules/finance/store/pulse-finance-context';
import { buildFinancialTrendData } from '@/modules/finance/chart-data/finance-chart-data';
import { AccountType } from '@/types/database';
import { AccountDTO } from '@/types/finance';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit3,
  Eye,
  Landmark,
  PauseCircle,
  PiggyBank,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  digital_wallet: 'Digital Wallet',
  investment: 'Investment',
  loan: 'Loan',
};

const ACCOUNT_COLORS = [
  '#A99BFF',
  '#8A7CF5',
  '#65D6A1',
  '#F17D8B',
  '#38BDF8',
  '#FBBF24',
];

function getAccountTypeIcon(type: AccountType) {
  switch (type) {
    case 'checking':
      return Landmark;
    case 'savings':
      return PiggyBank;
    case 'credit_card':
      return CreditCard;
    case 'investment':
      return TrendingUp;
    case 'digital_wallet':
      return Wallet;
    default:
      return Building2;
  }
}

export function FinancePageClient() {
  const {
    accounts,
    transactions,
    summary,
    currency,
    currencySymbol,
    formatMoney,
    createAccount,
    updateAccount,
    deleteAccount,
    createTransfer,
  } = usePulseFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id ?? ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  // Modals state
  const [accountModalMode, setAccountModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountDTO | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Account Form State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accCurrency, setAccCurrency] = useState(currency);
  const [accOpeningBalance, setAccOpeningBalance] = useState('0');
  const [accCreditLimit, setAccCreditLimit] = useState('');
  const [accDescription, setAccDescription] = useState('');
  const [accColor, setAccColor] = useState('#A99BFF');

  // Transfer Form State
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    accounts.find((a) => a.isActive)?.id ?? ''
  );
  const [destAccountId, setDestAccountId] = useState<string>(
    accounts.filter((a) => a.isActive)[1]?.id ?? ''
  );
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [transferDescription, setTransferDescription] = useState('');

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (statusFilter === 'active' && !acc.isActive) return false;
      if (statusFilter === 'inactive' && acc.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = acc.accountName.toLowerCase().includes(q);
        const matchesType = ACCOUNT_TYPE_LABELS[acc.accountType]
          .toLowerCase()
          .includes(q);
        const matchesDesc = acc.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesDesc) return false;
      }
      return true;
    });
  }, [accounts, statusFilter, searchQuery]);

  // Selected Account for Details View
  const selectedAccount = useMemo(
    () =>
      accounts.find((a) => a.id === selectedAccountId) ??
      filteredAccounts[0] ??
      accounts[0] ??
      null,
    [accounts, filteredAccounts, selectedAccountId]
  );

  // Account-specific transactions & metrics
  const selectedAccountMetrics = useMemo(() => {
    if (!selectedAccount) {
      return {
        txs: [],
        totalIncome: 0,
        totalExpenses: 0,
        totalTransfersIn: 0,
        totalTransfersOut: 0,
      };
    }
    const txs = transactions.filter((t) => t.accountId === selectedAccount.id);
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfersIn = 0;
    let totalTransfersOut = 0;

    for (const tx of txs) {
      const amt = Number(tx.amount) || 0;
      if (tx.transactionType === 'income') totalIncome += amt;
      else if (tx.transactionType === 'expense') totalExpenses += amt;
      else if (tx.transactionType === 'transfer') {
        if (tx.transferRole === 'destination') totalTransfersIn += amt;
        else totalTransfersOut += amt;
      }
    }

    return {
      txs,
      totalIncome,
      totalExpenses,
      totalTransfersIn,
      totalTransfersOut,
    };
  }, [selectedAccount, transactions]);

  // Account Balance Distribution (PieChart data)
  const balancePieData = useMemo(() => {
    const activePositive = accounts.filter(
      (a) => a.isActive && a.accountType !== 'credit_card' && Number(a.currentBalance) > 0
    );
    const total = activePositive.reduce(
      (sum, a) => sum + Number(a.currentBalance),
      0
    );
    return activePositive.map((a, idx) => {
      const val = Number(a.currentBalance);
      return {
        label: a.accountName,
        value: val,
        amount: val,
        percentage: total > 0 ? (val / total) * 100 : 0,
        color: a.color || ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length],
      };
    });
  }, [accounts]);

  // Account-wise Income vs Expenses (BarChart data)
  const accountBarData = useMemo(() => {
    return accounts
      .filter((a) => a.isActive)
      .map((acc) => {
        const accTxs = transactions.filter((t) => t.accountId === acc.id);
        const income = accTxs
          .filter((t) => t.transactionType === 'income')
          .reduce((s, t) => s + Number(t.amount), 0);
        const expense = accTxs
          .filter((t) => t.transactionType === 'expense')
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          account:
            acc.accountName.length > 12
              ? `${acc.accountName.slice(0, 12)}…`
              : acc.accountName,
          fullName: acc.accountName,
          income: Math.round(income * 100) / 100,
          expenses: Math.round(expense * 100) / 100,
        };
      });
  }, [accounts, transactions]);

  // Cash flow trend (AreaChart data)
  const cashFlowTrendData = useMemo(
    () => buildFinancialTrendData(summary.dailyCashFlow, 'month'),
    [summary.dailyCashFlow]
  );

  const activeAccountsCount = useMemo(
    () => accounts.filter((a) => a.isActive).length,
    [accounts]
  );

  // Handlers
  const openCreateAccountModal = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('checking');
    setAccCurrency(currency);
    setAccOpeningBalance('0');
    setAccCreditLimit('');
    setAccDescription('');
    setAccColor('#A99BFF');
    setAccountModalMode('create');
  };

  const openEditAccountModal = (acc: AccountDTO) => {
    setEditingAccount(acc);
    setAccName(acc.accountName);
    setAccType(acc.accountType);
    setAccCurrency(acc.currency);
    setAccOpeningBalance(acc.openingBalance);
    setAccCreditLimit(acc.creditLimit ?? '');
    setAccDescription(acc.description ?? '');
    setAccColor(acc.color ?? '#A99BFF');
    setAccountModalMode('edit');
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountModalMode === 'create') {
      const res = await createAccount({
        accountName: accName,
        accountType: accType,
        currency: accCurrency,
        openingBalance: String(Number(accOpeningBalance) || 0),
        creditLimit:
          accType === 'credit_card' && accCreditLimit
            ? String(Number(accCreditLimit))
            : undefined,
        description: accDescription || undefined,
        color: accColor,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setAccountModalMode(null);
    } else if (accountModalMode === 'edit' && editingAccount) {
      const res = await updateAccount({
        accountId: editingAccount.id,
        accountName: accName,
        accountType: accType,
        creditLimit:
          accType === 'credit_card' && accCreditLimit
            ? String(Number(accCreditLimit))
            : undefined,
        description: accDescription || undefined,
        color: accColor,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setAccountModalMode(null);
    }
  };

  const handleToggleAccountActive = async (acc: AccountDTO) => {
    const res = await updateAccount({
      accountId: acc.id,
      isActive: !acc.isActive,
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteTarget) return;
    const res = await deleteAccount(deleteTarget.id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    setDeleteTarget(null);
    if (res.ok && selectedAccountId === deleteTarget.id) {
      const next = accounts.find((a) => a.id !== deleteTarget.id);
      if (next) setSelectedAccountId(next.id);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTransfer({
      sourceAccountId,
      destinationAccountId: destAccountId,
      amount: String(Number(transferAmount)),
      transactionDate: transferDate,
      description: transferDescription || 'Internal Account Transfer',
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setTransferAmount('');
      setTransferDescription('');
      setShowTransferModal(false);
    }
  };

  return (
    <AppShell
      activeNav="finance"
      title="Finance & Account Management"
      subtitle="Comprehensive view of your financial position, multi-account balances, atomic transfers, and account analytics."
      onSearch={setSearchQuery}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => {
              const activeAccs = accounts.filter((a) => a.isActive);
              if (activeAccs[0]) setSourceAccountId(activeAccs[0].id);
              if (activeAccs[1]) setDestAccountId(activeAccs[1].id);
              setShowTransferModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.1] text-xs font-semibold text-[#F5F3FA] transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#A99BFF]" />
            <span>Transfer Funds</span>
          </button>

          <button
            type="button"
            onClick={openCreateAccountModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] hover:opacity-95 text-xs font-bold text-[#111014] shadow-[0_0_20px_rgba(169,155,255,0.35)] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Account</span>
          </button>
        </>
      }
    >
      {/* Inline Action Feedback Banner */}
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

      {/* A. Financial Overview Section (6 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Total Assets
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#65D6A1]/15 text-[#65D6A1]">
                +8.4%
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {formatMoney(summary.totalAssets)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Net Worth: {formatMoney(summary.netWorth)}
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Total Income
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#65D6A1]/15 text-[#65D6A1]">
                <ArrowUpRight className="w-3 h-3" />
                12.4%
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#65D6A1] mt-2 tabular-nums">
              {formatMoney(summary.totalIncome)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Excludes internal transfers
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Total Expenses
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#65D6A1]/15 text-[#65D6A1]">
                <ArrowDownRight className="w-3 h-3" />
                4.2%
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#F17D8B] mt-2 tabular-nums">
              {formatMoney(summary.totalExpenses)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Current reporting period
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Net Cash Flow
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A99BFF]/15 text-[#A99BFF]">
                Surplus
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#A99BFF] mt-2 tabular-nums">
              {formatMoney(summary.netCashFlow)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Income minus expenses
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Total Liabilities
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-[#A09BAE]">
                Credit
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {formatMoney(summary.totalLiabilities)}
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Revolving credit balances
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#A09BAE]">
                Active Accounts
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#65D6A1]/15 text-[#65D6A1]">
                {activeAccountsCount} / {accounts.length}
              </span>
            </div>
            <p className="text-xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {activeAccountsCount} Accounts
            </p>
            <p className="text-[10px] text-[#7E7890] mt-1">
              Reconciled in real-time
            </p>
          </div>
        </BorderGlow>
      </div>

      {/* B & E. Account Management Grid + Interactive Account Details Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Accounts Directory & Switcher */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
            <div className="bg-[#181620] rounded-[24px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#F5F3FA]">
                    Financial Accounts
                  </h2>
                  <p className="text-xs text-[#A09BAE]">
                    Select any account to inspect its balance, credit limit, and ledger history.
                  </p>
                </div>

                {/* Status Filter Pills */}
                <div className="inline-flex rounded-full bg-[#211E2A] border border-white/[0.07] p-0.5">
                  {(['all', 'active', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                        statusFilter === status
                          ? 'bg-[#A99BFF] text-[#111014]'
                          : 'text-[#A09BAE] hover:text-[#F5F3FA]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAccounts.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40">
                  <p className="text-xs text-[#A09BAE] mb-3">
                    No financial accounts match your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateAccountModal}
                    className="px-4 py-2 rounded-full bg-[#A99BFF] text-[#111014] text-xs font-bold"
                  >
                    Create First Account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAccounts.map((acc) => {
                    const Icon = getAccountTypeIcon(acc.accountType);
                    const isSelected = selectedAccount?.id === acc.id;
                    const isCredit = acc.accountType === 'credit_card';

                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#2B253A] via-[#221E2E] to-[#1B1824] border-[#A99BFF]/60 shadow-[0_8px_28px_rgba(169,155,255,0.16)]'
                            : 'bg-[#211E2A]/85 hover:bg-[#262232] border-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                              style={{
                                backgroundColor: `${acc.color || '#A99BFF'}22`,
                                color: acc.color || '#A99BFF',
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-[#F5F3FA] truncate">
                                  {acc.accountName}
                                </h3>
                                {!acc.isActive && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/10 text-[#A09BAE]">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#A09BAE]">
                                {ACCOUNT_TYPE_LABELS[acc.accountType]} • {acc.currency}
                              </p>
                            </div>
                          </div>

                          {/* Quick Card Actions */}
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openEditAccountModal(acc)}
                              aria-label={`Edit ${acc.accountName}`}
                              className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/10 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAccountActive(acc)}
                              aria-label={
                                acc.isActive
                                  ? `Deactivate ${acc.accountName}`
                                  : `Activate ${acc.accountName}`
                              }
                              className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#A99BFF] hover:bg-white/10 transition-colors"
                            >
                              {acc.isActive ? (
                                <PauseCircle className="w-3.5 h-3.5" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(acc)}
                              aria-label={`Delete ${acc.accountName}`}
                              className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F17D8B] hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-end justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#7E7890] block">
                              {isCredit ? 'Current Balance Used' : 'Current Balance'}
                            </span>
                            <span className="text-lg font-extrabold text-[#F5F3FA] tabular-nums">
                              {formatMoney(acc.currentBalance)}
                            </span>
                          </div>

                          {isCredit && acc.availableCredit != null && (
                            <div className="text-right">
                              <span className="text-[10px] text-[#7E7890] block">
                                Available Credit
                              </span>
                              <span className="text-xs font-semibold text-[#65D6A1] tabular-nums">
                                {formatMoney(acc.availableCredit)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </BorderGlow>
        </div>

        {/* E. Right 5 Columns: Selected Account Details & Account-Specific History */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
            <div className="bg-[#181620] rounded-[24px] p-5">
              {selectedAccount ? (
                <>
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.07]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: selectedAccount.color || '#A99BFF',
                          }}
                        />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A99BFF]">
                          {ACCOUNT_TYPE_LABELS[selectedAccount.accountType]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            selectedAccount.isActive
                              ? 'bg-[#65D6A1]/15 text-[#65D6A1]'
                              : 'bg-white/10 text-[#A09BAE]'
                          }`}
                        >
                          {selectedAccount.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h2 className="text-lg font-extrabold text-[#F5F3FA] mt-1">
                        {selectedAccount.accountName}
                      </h2>
                      {selectedAccount.description && (
                        <p className="text-xs text-[#A09BAE] mt-0.5">
                          {selectedAccount.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditAccountModal(selectedAccount)}
                        className="px-3 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.08] text-xs font-medium text-[#F5F3FA] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAccountActive(selectedAccount)}
                        className="px-3 py-1.5 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.08] text-xs font-medium text-[#A99BFF] transition-colors"
                      >
                        {selectedAccount.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {/* Account Key Balances */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
                    <div className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.05]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        Current Balance
                      </span>
                      <span className="text-sm font-bold text-[#F5F3FA] tabular-nums">
                        {formatMoney(selectedAccount.currentBalance)}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.05]">
                      <span className="text-[10px] text-[#A09BAE] block">
                        Opening Balance
                      </span>
                      <span className="text-sm font-bold text-[#C8C3D8] tabular-nums">
                        {formatMoney(selectedAccount.openingBalance)}
                      </span>
                    </div>
                    {selectedAccount.accountType === 'credit_card' ? (
                      <div className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.05]">
                        <span className="text-[10px] text-[#A09BAE] block">
                          Available Credit
                        </span>
                        <span className="text-sm font-bold text-[#65D6A1] tabular-nums">
                          {formatMoney(selectedAccount.availableCredit ?? 0)}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.05]">
                        <span className="text-[10px] text-[#A09BAE] block">
                          Account Net Flow
                        </span>
                        <span className="text-sm font-bold text-[#A99BFF] tabular-nums">
                          {formatMoney(
                            selectedAccountMetrics.totalIncome -
                              selectedAccountMetrics.totalExpenses
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Income & Expense Summary for Selected Account */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#65D6A1]/10 border border-[#65D6A1]/25 flex items-center justify-between">
                      <span className="text-xs font-medium text-[#C8C3D8]">
                        Account Income
                      </span>
                      <span className="text-xs font-bold text-[#65D6A1] tabular-nums">
                        +{formatMoney(selectedAccountMetrics.totalIncome)}
                      </span>
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#F17D8B]/10 border border-[#F17D8B]/25 flex items-center justify-between">
                      <span className="text-xs font-medium text-[#C8C3D8]">
                        Account Expenses
                      </span>
                      <span className="text-xs font-bold text-[#F17D8B] tabular-nums">
                        -{formatMoney(selectedAccountMetrics.totalExpenses)}
                      </span>
                    </div>
                  </div>

                  {/* Account-Specific Recent Transactions */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#A09BAE]">
                        Account Ledger Activity ({selectedAccountMetrics.txs.length})
                      </h3>
                    </div>

                    {selectedAccountMetrics.txs.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl bg-[#211E2A]/40 border border-dashed border-white/10 text-xs text-[#A09BAE]">
                        No transactions recorded for this account yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[270px] overflow-y-auto pr-1">
                        {selectedAccountMetrics.txs.slice(0, 8).map((tx) => {
                          const isIncome =
                            tx.transactionType === 'income' ||
                            (tx.transactionType === 'transfer' &&
                              tx.transferRole === 'destination');
                          const isTransfer = tx.transactionType === 'transfer';

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#211E2A]/85 border border-white/[0.05]"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#F5F3FA] truncate">
                                  {tx.merchantName || tx.description || 'Ledger Entry'}
                                </p>
                                <p className="text-[10px] text-[#A09BAE]">
                                  {tx.transactionDate} •{' '}
                                  {isTransfer
                                    ? `Transfer (${tx.transferRole})`
                                    : tx.transactionType}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-bold tabular-nums shrink-0 ${
                                  isTransfer
                                    ? 'text-[#A99BFF]'
                                    : isIncome
                                      ? 'text-[#65D6A1]'
                                      : 'text-[#F17D8B]'
                                }`}
                              >
                                {isIncome ? '+' : '-'}
                                {formatMoney(tx.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-[#A09BAE]">
                  Select an account to view its details.
                </div>
              )}
            </div>
          </BorderGlow>
        </div>
      </div>

      {/* D. Account Analytics Section (Using Supplied Bklit UI Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Account Balance Distribution (PieChart) */}
        <div className="lg:col-span-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Account Balance Distribution
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Share of positive asset balances across active accounts
                </p>
              </div>

              {balancePieData.length === 0 ? (
                <div className="min-h-[180px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                  No positive asset balances to display.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
                  <div className="shrink-0">
                    <PieChart
                      data={balancePieData}
                      size={148}
                      innerRadius={46}
                      padAngle={0.03}
                      cornerRadius={4}
                      hoverOffset={6}
                      hoveredIndex={hoveredPieIndex}
                      onHoverChange={setHoveredPieIndex}
                    >
                      {balancePieData.map((item, idx) => (
                        <PieSlice key={item.label} index={idx} showGlow />
                      ))}
                      <PieCenter defaultLabel="Total Assets">
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
                    {balancePieData.map((item, idx) => (
                      <li
                        key={item.label}
                        onMouseEnter={() => setHoveredPieIndex(idx)}
                        onMouseLeave={() => setHoveredPieIndex(null)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          hoveredPieIndex === idx ? 'bg-[#24202F]' : 'hover:bg-[#211E2A]/60'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0 text-[#C8C3D8]">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate font-medium">{item.label}</span>
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

        {/* 2. Account-Wise Income vs Expenses (BarChart) */}
        <div className="lg:col-span-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-base font-bold text-[#F5F3FA]">
                    Account Income vs Expenses
                  </h2>
                  <p className="text-xs text-[#A09BAE]">
                    Direct comparison across active accounts
                  </p>
                </div>
              </div>

              {accountBarData.length === 0 ? (
                <div className="min-h-[180px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                  No account activity available.
                </div>
              ) : (
                <div className="w-full">
                  <BarChart
                    data={accountBarData}
                    xDataKey="account"
                    aspectRatio="2.1 / 1"
                    margin={{ top: 14, right: 12, bottom: 28, left: 12 }}
                    barGap={0.25}
                    className="w-full min-h-[180px]"
                  >
                    <Grid horizontal />
                    <Bar
                      dataKey="income"
                      fill="var(--chart-line-primary)"
                      lineCap="round"
                    />
                    <Bar
                      dataKey="expenses"
                      fill="var(--chart-line-secondary)"
                      lineCap="round"
                    />
                    <BarXAxis />
                    <ChartTooltip
                      showDatePill={false}
                      rows={(point) => [
                        {
                          color: 'var(--chart-line-primary)',
                          label: 'Income',
                          value: formatMoney(Number(point.income) || 0),
                        },
                        {
                          color: 'var(--chart-line-secondary)',
                          label: 'Expenses',
                          value: formatMoney(Number(point.expenses) || 0),
                        },
                      ]}
                    />
                  </BarChart>
                </div>
              )}
            </div>
          </BorderGlow>
        </div>

        {/* 3. Cash Flow Trend (AreaChart) */}
        <div className="lg:col-span-4">
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
            <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
              <div className="mb-3">
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Cash Flow Velocity
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  30-day income & expenditure trajectory
                </p>
              </div>

              <div className="w-full">
                <AreaChart
                  aspectRatio="2.1 / 1"
                  data={cashFlowTrendData}
                  margin={{ top: 14, right: 12, bottom: 28, left: 12 }}
                  className="w-full min-h-[180px]"
                >
                  <Grid horizontal />
                  <Area
                    curve={curveMonotoneX}
                    dataKey="revenue"
                    fill="var(--chart-line-primary)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Area
                    curve={curveMonotoneX}
                    dataKey="costs"
                    fill="var(--chart-line-secondary)"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                  <SegmentBackground />
                  <SegmentLineFrom />
                  <SegmentLineTo />
                  <XAxis numTicks={5} />
                  <ChartTooltip
                    rows={(point) => [
                      {
                        color: 'var(--chart-line-primary)',
                        label: 'Income',
                        value: formatMoney(Number(point.revenue) || 0),
                      },
                      {
                        color: 'var(--chart-line-secondary)',
                        label: 'Expenses',
                        value: formatMoney(Number(point.costs) || 0),
                      },
                    ]}
                  />
                </AreaChart>
              </div>
            </div>
          </BorderGlow>
        </div>
      </div>

      {/* MODAL 1: Create / Edit Account */}
      {accountModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setAccountModalMode(null)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              {accountModalMode === 'create'
                ? 'Create Financial Account'
                : 'Edit Financial Account'}
            </h3>
            <p className="text-xs text-[#A09BAE] mb-5">
              Configure your account type, currency, and balance parameters.
            </p>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g., K Bank Platinum Checking"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Account Type *
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  >
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Currency
                  </label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value)}
                    disabled={accountModalMode === 'edit'}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF] disabled:opacity-60"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {accountModalMode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Opening Balance ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accOpeningBalance}
                    onChange={(e) => setAccOpeningBalance(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>
              )}

              {accType === 'credit_card' && (
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Credit Limit ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={accCreditLimit}
                    onChange={(e) => setAccCreditLimit(e.target.value)}
                    placeholder="e.g., 15000"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={accDescription}
                  onChange={(e) => setAccDescription(e.target.value)}
                  placeholder="Primary direct deposit & daily operating account"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Card Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {ACCOUNT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        accColor === color
                          ? 'border-white scale-110'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAccountModalMode(null)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE] hover:text-[#F5F3FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  {accountModalMode === 'create' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: C. Money Transfers Between Accounts */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              aria-label="Close transfer modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-[#A99BFF]/20 flex items-center justify-center text-[#A99BFF]">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3FA]">
                Transfer Funds Between Accounts
              </h3>
            </div>
            <p className="text-xs text-[#A09BAE] mb-5">
              Transfers atomically adjust source and destination balances and are excluded from income/expense totals.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Source Account (From) *
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
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

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Destination Account (To) *
                </label>
                <select
                  value={destAccountId}
                  onChange={(e) => setDestAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
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
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                    Transfer Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  placeholder="e.g., Monthly High-Yield Savings Sweep"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE] hover:text-[#F5F3FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Account Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">
              Delete &ldquo;{deleteTarget.accountName}&rdquo;?
            </h3>
            <p className="text-xs text-[#A09BAE] mb-5">
              Accounts with recorded ledger transactions cannot be deleted to preserve audit integrity (you can deactivate them instead). Empty accounts will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE] hover:text-[#F5F3FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-full bg-[#F17D8B] text-xs font-bold text-[#111014]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
