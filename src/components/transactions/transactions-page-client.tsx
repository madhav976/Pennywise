'use client';

import React, { useMemo, useState } from 'react';
import { curveMonotoneX } from 'd3-shape';
import {
  Area,
  AreaChart,
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
import {
  CategoryType,
  PaymentMethod,
  RecurringFrequency,
  TransactionType,
} from '@/types/database';
import { TransactionDTO } from '@/types/finance';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

type ReportingPeriod = 'all' | 'week' | 'month' | 'year' | 'custom';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  debit_card: 'Debit Card',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI / Instant Pay',
  digital_wallet: 'Digital Wallet',
  other: 'Other',
};

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const CATEGORY_COLORS = [
  '#A99BFF',
  '#F17D8B',
  '#65D6A1',
  '#8A7CF5',
  '#38BDF8',
  '#FBBF24',
  '#F472B6',
  '#34D399',
];

export function TransactionsPageClient() {
  const {
    accounts,
    transactions,
    categories,
    recurringTransactions,
    summary,
    currencySymbol,
    formatMoney,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    duplicateTransaction,
    createTransfer,
    createCategory,
    createRecurring,
    toggleRecurring,
    cancelRecurring,
    executeRecurringNow,
  } = usePulseFinance();

  // Active sub-tab: 'ledger' | 'recurring' | 'categories'
  const [activeTab, setActiveTab] = useState<'ledger' | 'recurring' | 'categories'>('ledger');

  // A. Reporting Period Selector
  const [reportingPeriod, setReportingPeriod] = useState<ReportingPeriod>('all');

  // D. Search and Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | PaymentMethod>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'transactionDate' | 'amount' | 'createdAt'>('transactionDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals State
  const [txModalMode, setTxModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingTx, setEditingTx] = useState<TransactionDTO | null>(null);
  const [viewingTx, setViewingTx] = useState<TransactionDTO | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionDTO | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // B. Add / Edit Transaction Form State
  const [txFormType, setTxFormType] = useState<TransactionType>('expense');
  const [txFormAmount, setTxFormAmount] = useState('');
  const [txFormDate, setTxFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [txFormAccountId, setTxFormAccountId] = useState(accounts[0]?.id ?? '');
  const [txFormDestAccountId, setTxFormDestAccountId] = useState(
    accounts[1]?.id ?? accounts[0]?.id ?? ''
  );
  const [txFormCategoryId, setTxFormCategoryId] = useState('');
  const [txFormPaymentMethod, setTxFormPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [txFormMerchant, setTxFormMerchant] = useState('');
  const [txFormDescription, setTxFormDescription] = useState('');
  const [txFormNotes, setTxFormNotes] = useState('');
  const [txFormReference, setTxFormReference] = useState('');

  // E. Custom Category Form State
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryType>('expense');
  const [catColor, setCatColor] = useState('#A99BFF');

  // F. Recurring Form State
  const [recType, setRecType] = useState<'income' | 'expense'>('expense');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id ?? '');
  const [recCategoryId, setRecCategoryId] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recPaymentMethod, setRecPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [recMerchant, setRecMerchant] = useState('');
  const [recDescription, setRecDescription] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [recEndDate, setRecEndDate] = useState('');

  // G. CSV Export Form State
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'range'>('filtered');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Lookup maps
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.accountName));
    return map;
  }, [accounts]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    categories.forEach((c) =>
      map.set(c.id, { name: c.name, color: c.color || '#A99BFF' })
    );
    return map;
  }, [categories]);

  // Period boundary helper
  const periodStartEnd = useMemo(() => {
    const now = new Date();
    if (reportingPeriod === 'week') {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - 7);
      return { start: d.toISOString().slice(0, 10), end: '9999-12-31' };
    }
    if (reportingPeriod === 'month') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
      return { start, end: '9999-12-31' };
    }
    if (reportingPeriod === 'year') {
      const start = `${now.getUTCFullYear()}-01-01`;
      return { start, end: '9999-12-31' };
    }
    if (reportingPeriod === 'custom') {
      return {
        start: filterStartDate || '0000-01-01',
        end: filterEndDate || '9999-12-31',
      };
    }
    return { start: '0000-01-01', end: '9999-12-31' };
  }, [reportingPeriod, filterStartDate, filterEndDate]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Reporting period filter
        if (
          tx.transactionDate < periodStartEnd.start ||
          tx.transactionDate > periodStartEnd.end
        ) {
          return false;
        }
        // Explicit date range filter
        if (filterStartDate && tx.transactionDate < filterStartDate) return false;
        if (filterEndDate && tx.transactionDate > filterEndDate) return false;
        // Type filter
        if (filterType !== 'all' && tx.transactionType !== filterType) return false;
        // Category filter
        if (filterCategoryId !== 'all' && tx.categoryId !== filterCategoryId)
          return false;
        // Account filter
        if (filterAccountId !== 'all' && tx.accountId !== filterAccountId)
          return false;
        // Payment method filter
        if (
          filterPaymentMethod !== 'all' &&
          tx.paymentMethod !== filterPaymentMethod
        ) {
          return false;
        }
        // Min / Max Amount
        const amt = Number(tx.amount) || 0;
        if (filterMinAmount !== '' && amt < Number(filterMinAmount)) return false;
        if (filterMaxAmount !== '' && amt > Number(filterMaxAmount)) return false;

        // Search query (Merchant, Description, Category, Reference ID)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const catNameMatch = tx.categoryId
            ? categoryMap.get(tx.categoryId)?.name.toLowerCase().includes(q)
            : false;
          const merchantMatch = tx.merchantName?.toLowerCase().includes(q);
          const descMatch = tx.description?.toLowerCase().includes(q);
          const refMatch = tx.referenceNumber?.toLowerCase().includes(q);
          if (!catNameMatch && !merchantMatch && !descMatch && !refMatch) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'transactionDate') {
          cmp = a.transactionDate.localeCompare(b.transactionDate);
        } else if (sortBy === 'amount') {
          cmp = Number(a.amount) - Number(b.amount);
        } else {
          cmp = a.createdAt.localeCompare(b.createdAt);
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [
    transactions,
    periodStartEnd,
    filterStartDate,
    filterEndDate,
    filterType,
    filterCategoryId,
    filterAccountId,
    filterPaymentMethod,
    filterMinAmount,
    filterMaxAmount,
    searchQuery,
    categoryMap,
    sortBy,
    sortDirection,
  ]);

  // Overview Metrics for Filtered Period (Excludes transfers from income & expense)
  const periodMetrics = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of filteredTransactions) {
      const amt = Number(tx.amount) || 0;
      if (tx.transactionType === 'income') income += amt;
      else if (tx.transactionType === 'expense') expenses += amt;
    }
    return {
      income,
      expenses,
      netCashFlow: income - expenses,
      totalCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, totalPages]);

  // Category Distribution PieChart Data (from filtered expenses)
  const categoryPieData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const tx of filteredTransactions) {
      if (tx.transactionType !== 'expense') continue;
      const amt = Number(tx.amount) || 0;
      const key = tx.categoryId || 'uncategorized';
      map.set(key, (map.get(key) ?? 0) + amt);
      total += amt;
    }
    return Array.from(map.entries())
      .map(([catId, amount], idx) => {
        const meta = categoryMap.get(catId);
        return {
          label: meta?.name ?? 'Uncategorized',
          value: Math.round(amount * 100) / 100,
          amount: Math.round(amount * 100) / 100,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: meta?.color ?? CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, categoryMap]);

  // Trend AreaChart Data
  const trendData = useMemo(
    () => buildFinancialTrendData(summary.dailyCashFlow, 'month'),
    [summary.dailyCashFlow]
  );

  // Clear All Filters
  const handleClearAllFilters = () => {
    setReportingPeriod('all');
    setSearchQuery('');
    setFilterType('all');
    setFilterCategoryId('all');
    setFilterAccountId('all');
    setFilterPaymentMethod('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setCurrentPage(1);
  };

  // Open Create Transaction Modal
  const openCreateTxModal = (defaultType: TransactionType = 'expense') => {
    setEditingTx(null);
    setTxFormType(defaultType);
    setTxFormAmount('');
    setTxFormDate(new Date().toISOString().slice(0, 10));
    const firstActiveAcc = accounts.find((a) => a.isActive)?.id ?? accounts[0]?.id ?? '';
    const secondActiveAcc =
      accounts.filter((a) => a.isActive)[1]?.id ?? firstActiveAcc;
    setTxFormAccountId(firstActiveAcc);
    setTxFormDestAccountId(secondActiveAcc);
    const matchingCat = categories.find(
      (c) => c.categoryType === (defaultType === 'income' ? 'income' : 'expense')
    );
    setTxFormCategoryId(matchingCat?.id ?? '');
    setTxFormPaymentMethod('credit_card');
    setTxFormMerchant('');
    setTxFormDescription('');
    setTxFormNotes('');
    setTxFormReference(
      `#${Math.floor(10000 + Math.random() * 90000)}`
    );
    setTxModalMode('create');
  };

  const openEditTxModal = (tx: TransactionDTO) => {
    setEditingTx(tx);
    setTxFormType(tx.transactionType);
    setTxFormAmount(tx.amount);
    setTxFormDate(tx.transactionDate);
    setTxFormAccountId(tx.accountId);
    setTxFormCategoryId(tx.categoryId ?? '');
    setTxFormPaymentMethod(tx.paymentMethod);
    setTxFormMerchant(tx.merchantName ?? '');
    setTxFormDescription(tx.description ?? '');
    setTxFormNotes(tx.notes ?? '');
    setTxFormReference(tx.referenceNumber ?? '');
    setTxModalMode('edit');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txModalMode === 'create') {
      if (txFormType === 'transfer') {
        const res = await createTransfer({
          sourceAccountId: txFormAccountId,
          destinationAccountId: txFormDestAccountId,
          amount: String(Number(txFormAmount)),
          transactionDate: txFormDate,
          description: txFormDescription || txFormMerchant || 'Internal Transfer',
        });
        setFeedbackBanner({
          type: res.ok ? 'success' : 'error',
          text: res.message,
        });
        if (res.ok) setTxModalMode(null);
        return;
      }

      const res = await createTransaction({
        accountId: txFormAccountId,
        categoryId: txFormCategoryId,
        transactionType: txFormType,
        amount: String(Number(txFormAmount)),
        paymentMethod: txFormPaymentMethod,
        transactionDate: txFormDate,
        description: txFormDescription || txFormMerchant || 'Transaction',
        merchantName: txFormMerchant || undefined,
        notes: txFormNotes || undefined,
        referenceNumber: txFormReference || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setTxModalMode(null);
    } else if (txModalMode === 'edit' && editingTx) {
      const res = await updateTransaction({
        transactionId: editingTx.id,
        accountId: txFormAccountId,
        categoryId: txFormCategoryId || undefined,
        amount: String(Number(txFormAmount)),
        paymentMethod: txFormPaymentMethod,
        transactionDate: txFormDate,
        description: txFormDescription || undefined,
        merchantName: txFormMerchant || undefined,
        notes: txFormNotes || undefined,
      });
      setFeedbackBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) setTxModalMode(null);
    }
  };

  const handleDuplicateTx = async (id: string) => {
    const res = await duplicateTransaction(id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleConfirmDeleteTx = async () => {
    if (!deletingTx) return;
    const res = await deleteTransaction(deletingTx.id);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    setDeletingTx(null);
    if (viewingTx?.id === deletingTx.id) setViewingTx(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCategory(catName, catType, catColor);
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setCatName('');
      setShowCategoryModal(false);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createRecurring({
      accountId: recAccountId,
      categoryId: recCategoryId,
      transactionType: recType,
      amount: String(Number(recAmount)),
      paymentMethod: recPaymentMethod,
      description: recDescription || recMerchant || 'Recurring Schedule',
      merchantName: recMerchant || undefined,
      frequency: recFrequency,
      startDate: recStartDate,
      endDate: recEndDate || null,
    });
    setFeedbackBanner({
      type: res.ok ? 'success' : 'error',
      text: res.message,
    });
    if (res.ok) {
      setRecAmount('');
      setRecMerchant('');
      setRecDescription('');
      setShowRecurringModal(false);
    }
  };

  // G. Functional CSV Export
  const handleDownloadCsv = (e: React.FormEvent) => {
    e.preventDefault();
    let rowsToExport = filteredTransactions;
    if (exportScope === 'all') {
      rowsToExport = transactions;
    } else if (exportScope === 'range') {
      rowsToExport = transactions.filter((tx) => {
        if (exportStartDate && tx.transactionDate < exportStartDate) return false;
        if (exportEndDate && tx.transactionDate > exportEndDate) return false;
        return true;
      });
    }

    const headers = [
      'Date',
      'Type',
      'Merchant',
      'Description',
      'Category',
      'Account',
      'Payment Method',
      'Amount',
      'Currency',
      'Reference ID',
    ];

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const csvLines = [
      headers.join(','),
      ...rowsToExport.map((tx) =>
        [
          escapeCsv(tx.transactionDate),
          escapeCsv(tx.transactionType),
          escapeCsv(tx.merchantName ?? ''),
          escapeCsv(tx.description ?? ''),
          escapeCsv(
            tx.categoryId
              ? categoryMap.get(tx.categoryId)?.name ?? 'Uncategorized'
              : tx.transactionType === 'transfer'
                ? 'Transfer'
                : 'Uncategorized'
          ),
          escapeCsv(accountMap.get(tx.accountId) ?? 'Account'),
          escapeCsv(PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod),
          escapeCsv(tx.amount),
          escapeCsv(tx.currency),
          escapeCsv(tx.referenceNumber ?? ''),
        ].join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `pulse-transactions-${exportScope}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportModal(false);
    setFeedbackBanner({
      type: 'success',
      text: `Exported ${rowsToExport.length} transactions to CSV.`,
    });
  };

  return (
    <AppShell
      activeNav="transactions"
      title="Transactions & Financial Ledger"
      subtitle="Search, filter, categorize, automate recurring schedules, and export your complete financial history."
      onSearch={setSearchQuery}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.1] text-xs font-semibold text-[#F5F3FA] transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#A99BFF]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#24202F] hover:bg-[#2E293C] border border-white/[0.1] text-xs font-semibold text-[#F5F3FA] transition-all"
          >
            <Tag className="w-3.5 h-3.5 text-[#65D6A1]" />
            <span>New Category</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateTxModal('expense')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] hover:opacity-95 text-xs font-bold text-[#111014] shadow-[0_0_20px_rgba(169,155,255,0.35)] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Transaction</span>
          </button>
        </>
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

      {/* A. Reporting Period Bar + Module Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sub-tabs: Ledger, Recurring Schedules, Categories */}
        <div className="inline-flex rounded-full bg-[#1C1923] border border-white/[0.08] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'ledger'
                ? 'bg-[#A99BFF] text-[#111014]'
                : 'text-[#A09BAE] hover:text-[#F5F3FA]'
            }`}
          >
            Transaction Ledger ({filteredTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'recurring'
                ? 'bg-[#A99BFF] text-[#111014]'
                : 'text-[#A09BAE] hover:text-[#F5F3FA]'
            }`}
          >
            Recurring Schedules ({recurringTransactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-[#A99BFF] text-[#111014]'
                : 'text-[#A09BAE] hover:text-[#F5F3FA]'
            }`}
          >
            Categories ({categories.length})
          </button>
        </div>

        {/* Reporting Period Selector */}
        <div className="inline-flex items-center gap-1 rounded-full bg-[#1C1923] border border-white/[0.08] p-1">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setReportingPeriod(p.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                reportingPeriod === p.id
                  ? 'bg-[#2B253A] text-[#F5F3FA] border border-[#A99BFF]/40'
                  : 'text-[#A09BAE] hover:text-[#F5F3FA]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* A. Transaction Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A09BAE]">
                Period Income
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#65D6A1]/15 text-[#65D6A1]">
                <ArrowUpRight className="w-3 h-3" />
                Inflow
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#65D6A1] mt-2 tabular-nums">
              {formatMoney(periodMetrics.income)}
            </p>
            <p className="text-[11px] text-[#7E7890] mt-1">
              Posted income in selected period
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A09BAE]">
                Period Expenses
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F17D8B]/15 text-[#F17D8B]">
                <ArrowDownRight className="w-3 h-3" />
                Outflow
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#F17D8B] mt-2 tabular-nums">
              {formatMoney(periodMetrics.expenses)}
            </p>
            <p className="text-[11px] text-[#7E7890] mt-1">
              Automatically updates budgets
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A09BAE]">
                Net Cash Flow
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  periodMetrics.netCashFlow >= 0
                    ? 'bg-[#65D6A1]/15 text-[#65D6A1]'
                    : 'bg-[#F17D8B]/15 text-[#F17D8B]'
                }`}
              >
                {periodMetrics.netCashFlow >= 0 ? 'Positive' : 'Deficit'}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#A99BFF] mt-2 tabular-nums">
              {formatMoney(periodMetrics.netCashFlow)}
            </p>
            <p className="text-[11px] text-[#7E7890] mt-1">
              Transfers excluded from cash flow
            </p>
          </div>
        </BorderGlow>

        <BorderGlow roundedClassName="rounded-[22px]" glowRadius={180}>
          <div className="bg-[#181620] rounded-[22px] p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A09BAE]">
                Matching Records
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.07] text-[#F5F3FA]">
                Ledger
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#F5F3FA] mt-2 tabular-nums">
              {periodMetrics.totalCount}
            </p>
            <p className="text-[11px] text-[#7E7890] mt-1">
              Out of {transactions.length} total entries
            </p>
          </div>
        </BorderGlow>
      </div>

      {/* TAB 1: TRANSACTION LEDGER + FILTERS + CHARTS */}
      {activeTab === 'ledger' && (
        <>
          {/* D. Comprehensive Search & Multi-Filter Control Panel */}
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
            <div className="bg-[#181620] rounded-[24px] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#A99BFF]" />
                  <h2 className="text-sm font-bold text-[#F5F3FA]">
                    Search & Multi-Dimension Filters
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#24202F] hover:bg-[#2E293C] text-[11px] font-semibold text-[#A99BFF] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All Filters</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                {/* Search input */}
                <div className="xl:col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Search Merchant / Desc / Ref
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="e.g., Starbucks, #73246, Salary..."
                    className="w-full h-9 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>

                {/* Type filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as 'all' | TransactionType);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Category
                  </label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => {
                      setFilterCategoryId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.categoryType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Account
                  </label>
                  <select
                    value={filterAccountId}
                    onChange={(e) => {
                      setFilterAccountId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  >
                    <option value="all">All Accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method filter */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={filterPaymentMethod}
                    onChange={(e) => {
                      setFilterPaymentMethod(
                        e.target.value as 'all' | PaymentMethod
                      );
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  >
                    <option value="all">All Methods</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min / Max Amount */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Min Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filterMinAmount}
                    onChange={(e) => {
                      setFilterMinAmount(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="0.00"
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A09BAE] mb-1">
                    Max Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={filterMaxAmount}
                    onChange={(e) => {
                      setFilterMaxAmount(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Any"
                    className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] focus:outline-none focus:border-[#A99BFF]"
                  />
                </div>
              </div>

              {/* Date Range + Sort Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#A09BAE]">From:</span>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-8 px-2.5 rounded-lg bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#A09BAE]">To:</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => {
                        setFilterEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-8 px-2.5 rounded-lg bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#A09BAE]">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | 'transactionDate'
                          | 'amount'
                          | 'createdAt'
                      )
                    }
                    className="h-8 px-2.5 rounded-lg bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    <option value="transactionDate">Transaction Date</option>
                    <option value="amount">Amount</option>
                    <option value="createdAt">Recorded Timestamp</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                    }
                    className="h-8 px-3 rounded-lg bg-[#211E2A] border border-white/[0.08] text-xs font-semibold text-[#A99BFF]"
                  >
                    {sortDirection === 'desc' ? 'Newest / Highest' : 'Oldest / Lowest'}
                  </button>
                </div>
              </div>
            </div>
          </BorderGlow>

          {/* Transactions Table */}
          <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
            <div className="bg-[#181620] rounded-[24px] p-5 overflow-hidden">
              {paginatedTransactions.length === 0 ? (
                <div className="py-14 text-center rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40">
                  <p className="text-xs text-[#A09BAE] mb-3">
                    No transactions match your active filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="px-4 py-2 rounded-full bg-[#A99BFF] text-[#111014] text-xs font-bold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-[#7E7890]">
                          <th className="py-3 px-3">Merchant / Description</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3">Account</th>
                          <th className="py-3 px-3">Method</th>
                          <th className="py-3 px-3">Date & Ref</th>
                          <th className="py-3 px-3 text-right">Amount</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-xs">
                        {paginatedTransactions.map((tx) => {
                          const cat = tx.categoryId
                            ? categoryMap.get(tx.categoryId)
                            : null;
                          const isIncome =
                            tx.transactionType === 'income' ||
                            (tx.transactionType === 'transfer' &&
                              tx.transferRole === 'destination');
                          const isTransfer = tx.transactionType === 'transfer';

                          return (
                            <tr
                              key={tx.id}
                              onClick={() => setViewingTx(tx)}
                              className="hover:bg-[#211E2A]/75 cursor-pointer transition-colors"
                            >
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                                    style={{
                                      backgroundColor: isTransfer
                                        ? 'rgba(169,155,255,0.18)'
                                        : isIncome
                                          ? 'rgba(101,214,161,0.18)'
                                          : 'rgba(241,125,139,0.18)',
                                      color: isTransfer
                                        ? '#A99BFF'
                                        : isIncome
                                          ? '#65D6A1'
                                          : '#F17D8B',
                                    }}
                                  >
                                    {(
                                      tx.merchantName ||
                                      tx.description ||
                                      'TX'
                                    )
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#F5F3FA] truncate">
                                      {tx.merchantName ||
                                        tx.description ||
                                        'Financial Entry'}
                                    </p>
                                    {tx.description &&
                                      tx.merchantName &&
                                      tx.description !== tx.merchantName && (
                                        <p className="text-[11px] text-[#A09BAE] truncate max-w-[220px]">
                                          {tx.description}
                                        </p>
                                      )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                {isTransfer ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#A99BFF]/15 text-[#A99BFF]">
                                    <ArrowLeftRight className="w-3 h-3" />
                                    Transfer ({tx.transferRole})
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#24202F] text-[#E2DFEC]"
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{
                                        backgroundColor: cat?.color || '#A99BFF',
                                      }}
                                    />
                                    {cat?.name || 'Uncategorized'}
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-[#C8C3D8]">
                                {accountMap.get(tx.accountId) || 'Account'}
                              </td>

                              <td className="py-3.5 px-3 text-[#A09BAE]">
                                {PAYMENT_METHOD_LABELS[tx.paymentMethod] ||
                                  tx.paymentMethod}
                              </td>

                              <td className="py-3.5 px-3">
                                <span className="text-[#F5F3FA] block">
                                  {tx.transactionDate}
                                </span>
                                <span className="text-[10px] font-mono text-[#7E7890]">
                                  {tx.referenceNumber || `#${tx.id.slice(-5)}`}
                                </span>
                              </td>

                              <td className="py-3.5 px-3 text-right font-bold tabular-nums">
                                <span
                                  className={
                                    isTransfer
                                      ? 'text-[#A99BFF]'
                                      : isIncome
                                        ? 'text-[#65D6A1]'
                                        : 'text-[#F17D8B]'
                                  }
                                >
                                  {isIncome ? '+' : '-'}
                                  {formatMoney(tx.amount)}
                                </span>
                              </td>

                              <td
                                className="py-3.5 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingTx(tx)}
                                    aria-label="View transaction details"
                                    className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/10"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {!isTransfer && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditTxModal(tx)}
                                        aria-label="Edit transaction"
                                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#A99BFF] hover:bg-white/10"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateTx(tx.id)}
                                        aria-label="Duplicate transaction"
                                        className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#65D6A1] hover:bg-white/10"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDeletingTx(tx)}
                                    aria-label="Delete transaction"
                                    className="p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F17D8B] hover:bg-white/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/[0.06] text-xs text-[#A09BAE]">
                    <span>
                      Page {currentPage} of {totalPages} ({filteredTransactions.length}{' '}
                      matching records)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded-full bg-[#24202F] text-[#F5F3FA] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="px-3 py-1 rounded-full bg-[#24202F] text-[#F5F3FA] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </BorderGlow>

          {/* Transactions Page Charts (Bklit UI AreaChart + PieChart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
                <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
                  <div className="mb-3">
                    <h2 className="text-base font-bold text-[#F5F3FA]">
                      Income vs Expense Trend
                    </h2>
                    <p className="text-xs text-[#A09BAE]">
                      Daily posted inflows and outflows across your ledger
                    </p>
                  </div>
                  <div className="w-full">
                    <AreaChart
                      aspectRatio="2.8 / 1"
                      data={trendData}
                      margin={{ top: 14, right: 12, bottom: 28, left: 12 }}
                      className="w-full min-h-[190px]"
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
                      <XAxis numTicks={6} />
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

            <div className="lg:col-span-5">
              <BorderGlow roundedClassName="rounded-[24px]" glowRadius={220} className="h-full">
                <div className="bg-[#181620] rounded-[24px] p-5 h-full flex flex-col justify-between">
                  <div className="mb-3">
                    <h2 className="text-base font-bold text-[#F5F3FA]">
                      Category Distribution
                    </h2>
                    <p className="text-xs text-[#A09BAE]">
                      Breakdown of filtered expense transactions by category
                    </p>
                  </div>

                  {categoryPieData.length === 0 ? (
                    <div className="min-h-[180px] rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 flex items-center justify-center text-xs text-[#A09BAE]">
                      No expense transactions in current filter.
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 my-auto">
                      <div className="shrink-0">
                        <PieChart
                          data={categoryPieData}
                          size={148}
                          innerRadius={46}
                          padAngle={0.03}
                          cornerRadius={4}
                          hoverOffset={6}
                          hoveredIndex={hoveredPieIndex}
                          onHoverChange={setHoveredPieIndex}
                        >
                          {categoryPieData.map((item, idx) => (
                            <PieSlice key={item.label} index={idx} showGlow />
                          ))}
                          <PieCenter defaultLabel="Filtered Spend">
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
                        {categoryPieData.slice(0, 5).map((item, idx) => (
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
        </>
      )}

      {/* TAB 2: F. RECURRING TRANSACTIONS MANAGER */}
      {activeTab === 'recurring' && (
        <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
          <div className="bg-[#181620] rounded-[24px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Recurring Transaction Schedules
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  Automate daily, weekly, monthly, or yearly bills and income with duplicate-execution protection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecAccountId(accounts[0]?.id ?? '');
                  const expCat = categories.find((c) => c.categoryType === 'expense');
                  setRecCategoryId(expCat?.id ?? '');
                  setShowRecurringModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
              >
                <Plus className="w-4 h-4" />
                <span>New Recurring Schedule</span>
              </button>
            </div>

            {recurringTransactions.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#211E2A]/40 text-xs text-[#A09BAE]">
                No recurring schedules configured yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recurringTransactions.map((rec) => {
                  const cat = rec.categoryId ? categoryMap.get(rec.categoryId) : null;
                  const accName = accountMap.get(rec.accountId) || 'Account';

                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl bg-[#211E2A] border border-white/[0.07] p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#A99BFF]/20 text-[#A99BFF]">
                              {FREQUENCY_LABELS[rec.frequency]}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                rec.isActive
                                  ? 'bg-[#65D6A1]/15 text-[#65D6A1]'
                                  : 'bg-white/10 text-[#A09BAE]'
                              }`}
                            >
                              {rec.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#F5F3FA] mt-2">
                            {rec.merchantName || rec.description || 'Recurring Schedule'}
                          </h3>
                          <p className="text-[11px] text-[#A09BAE]">
                            {accName} • {cat?.name || rec.transactionType}
                          </p>
                        </div>

                        <span
                          className={`text-base font-extrabold tabular-nums ${
                            rec.transactionType === 'income'
                              ? 'text-[#65D6A1]'
                              : 'text-[#F17D8B]'
                          }`}
                        >
                          {rec.transactionType === 'income' ? '+' : '-'}
                          {formatMoney(rec.amount)}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#A09BAE] space-y-0.5 pt-2 border-t border-white/[0.06]">
                        <p>
                          Next Execution:{' '}
                          <span className="font-semibold text-[#F5F3FA]">
                            {rec.nextExecutionDate}
                          </span>
                        </p>
                        {rec.lastExecutedAt && (
                          <p>
                            Last Executed:{' '}
                            <span className="text-[#C8C3D8]">
                              {rec.lastExecutedAt.slice(0, 10)}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await executeRecurringNow(rec.id);
                            setFeedbackBanner({
                              type: res.ok ? 'success' : 'error',
                              text: res.message,
                            });
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-[#A99BFF]/20 hover:bg-[#A99BFF]/30 text-[#A99BFF] text-xs font-semibold transition-colors"
                        >
                          Execute Due Now
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRecurring(rec.id)}
                          className="p-1.5 rounded-xl bg-[#292535] text-[#A09BAE] hover:text-[#F5F3FA]"
                          aria-label={rec.isActive ? 'Pause schedule' : 'Resume schedule'}
                        >
                          {rec.isActive ? (
                            <PauseCircle className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await cancelRecurring(rec.id);
                            setFeedbackBanner({
                              type: res.ok ? 'success' : 'error',
                              text: res.message,
                            });
                          }}
                          className="p-1.5 rounded-xl bg-[#292535] text-[#A09BAE] hover:text-[#F17D8B]"
                          aria-label="Cancel schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </BorderGlow>
      )}

      {/* TAB 3: E. CATEGORIES DIRECTORY */}
      {activeTab === 'categories' && (
        <BorderGlow roundedClassName="rounded-[24px]" glowRadius={240}>
          <div className="bg-[#181620] rounded-[24px] p-5 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F5F3FA]">
                  Income & Expense Categories
                </h2>
                <p className="text-xs text-[#A09BAE]">
                  System default categories and your custom user-defined categories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expense Categories */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F17D8B] mb-3">
                  Expense Categories (
                  {categories.filter((c) => c.categoryType === 'expense').length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories
                    .filter((c) => c.categoryType === 'expense')
                    .map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#211E2A] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#A99BFF' }}
                          />
                          <span className="text-xs font-semibold text-[#F5F3FA] truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A09BAE]">
                          {cat.isSystem ? 'System' : 'Custom'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Income Categories */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#65D6A1] mb-3">
                  Income Categories (
                  {categories.filter((c) => c.categoryType === 'income').length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories
                    .filter((c) => c.categoryType === 'income')
                    .map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#211E2A] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#65D6A1' }}
                          />
                          <span className="text-xs font-semibold text-[#F5F3FA] truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A09BAE]">
                          {cat.isSystem ? 'System' : 'Custom'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </BorderGlow>
      )}

      {/* MODAL 1: B & C. Add / Edit Transaction */}
      {txModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setTxModalMode(null)}
              aria-label="Close transaction modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              {txModalMode === 'create' ? 'Record Transaction' : 'Edit Transaction'}
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Every transaction atomically updates your account balance, financial overview, and active budgets.
            </p>

            {/* Transaction Type Segmented Switch */}
            {txModalMode === 'create' && (
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-[#211E2A] border border-white/[0.06] mb-4">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTxFormType(t);
                      if (t !== 'transfer') {
                        const firstCat = categories.find(
                          (c) => c.categoryType === t
                        );
                        setTxFormCategoryId(firstCat?.id ?? '');
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      txFormType === t
                        ? t === 'income'
                          ? 'bg-[#65D6A1] text-[#111014]'
                          : t === 'expense'
                            ? 'bg-[#F17D8B] text-[#111014]'
                            : 'bg-[#A99BFF] text-[#111014]'
                        : 'text-[#A09BAE] hover:text-[#F5F3FA]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={txFormAmount}
                    onChange={(e) => setTxFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={txFormDate}
                    onChange={(e) => setTxFormDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              {txFormType === 'transfer' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Source Account *
                    </label>
                    <select
                      value={txFormAccountId}
                      onChange={(e) => setTxFormAccountId(e.target.value)}
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
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Destination Account *
                    </label>
                    <select
                      value={txFormDestAccountId}
                      onChange={(e) => setTxFormDestAccountId(e.target.value)}
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
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Account *
                    </label>
                    <select
                      value={txFormAccountId}
                      onChange={(e) => setTxFormAccountId(e.target.value)}
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
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Category *
                    </label>
                    <select
                      value={txFormCategoryId}
                      onChange={(e) => setTxFormCategoryId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    >
                      {categories
                        .filter((c) => c.categoryType === txFormType)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {txFormType !== 'transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Merchant / Counterparty
                    </label>
                    <input
                      type="text"
                      value={txFormMerchant}
                      onChange={(e) => setTxFormMerchant(e.target.value)}
                      placeholder="e.g., Starbucks, Apple, Employer"
                      className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Payment Method
                    </label>
                    <select
                      value={txFormPaymentMethod}
                      onChange={(e) =>
                        setTxFormPaymentMethod(e.target.value as PaymentMethod)
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={txFormDescription}
                  onChange={(e) => setTxFormDescription(e.target.value)}
                  placeholder="Brief description of transaction"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              {txFormType !== 'transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={txFormNotes}
                      onChange={(e) => setTxFormNotes(e.target.value)}
                      placeholder="Optional memo or tag"
                      className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Reference ID
                    </label>
                    <input
                      type="text"
                      value={txFormReference}
                      onChange={(e) => setTxFormReference(e.target.value)}
                      placeholder="#73246"
                      className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA] font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setTxModalMode(null)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE] hover:text-[#F5F3FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  {txModalMode === 'create' ? 'Save Transaction' : 'Update Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: H. Transaction Details Modal */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setViewingTx(null)}
              aria-label="Close transaction details"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#A99BFF]/20 text-[#A99BFF]">
              {viewingTx.transactionType}
            </span>
            <h3 className="text-lg font-extrabold text-[#F5F3FA] mt-2">
              {viewingTx.merchantName ||
                viewingTx.description ||
                'Transaction Details'}
            </h3>
            <p className="text-2xl font-extrabold text-[#A99BFF] mt-1 tabular-nums">
              {formatMoney(viewingTx.amount)}
            </p>

            <div className="space-y-2 my-4 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Account</span>
                <span className="font-semibold text-[#F5F3FA]">
                  {accountMap.get(viewingTx.accountId) || 'Account'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Category</span>
                <span className="font-semibold text-[#F5F3FA]">
                  {viewingTx.categoryId
                    ? categoryMap.get(viewingTx.categoryId)?.name ?? 'Uncategorized'
                    : viewingTx.transactionType === 'transfer'
                      ? `Transfer (${viewingTx.transferRole})`
                      : 'Uncategorized'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Payment Method</span>
                <span className="font-semibold text-[#F5F3FA]">
                  {PAYMENT_METHOD_LABELS[viewingTx.paymentMethod] ||
                    viewingTx.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Transaction Date</span>
                <span className="font-semibold text-[#F5F3FA]">
                  {viewingTx.transactionDate}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Reference Number</span>
                <span className="font-mono text-[#F5F3FA]">
                  {viewingTx.referenceNumber || `#${viewingTx.id.slice(-6)}`}
                </span>
              </div>
              {viewingTx.description && (
                <div className="p-2.5 rounded-xl bg-[#211E2A]">
                  <span className="text-[#A09BAE] block mb-0.5">Description</span>
                  <span className="text-[#F5F3FA]">{viewingTx.description}</span>
                </div>
              )}
              {viewingTx.notes && (
                <div className="p-2.5 rounded-xl bg-[#211E2A]">
                  <span className="text-[#A09BAE] block mb-0.5">Notes</span>
                  <span className="text-[#F5F3FA]">{viewingTx.notes}</span>
                </div>
              )}
              <div className="flex justify-between p-2.5 rounded-xl bg-[#211E2A]">
                <span className="text-[#A09BAE]">Recorded Timestamp</span>
                <span className="font-mono text-[11px] text-[#C8C3D8]">
                  {new Date(viewingTx.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              {viewingTx.transactionType !== 'transfer' && (
                <button
                  type="button"
                  onClick={() => {
                    const tx = viewingTx;
                    setViewingTx(null);
                    openEditTxModal(tx);
                  }}
                  className="px-4 py-2 rounded-full bg-[#24202F] hover:bg-[#2E293C] text-xs font-semibold text-[#F5F3FA]"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const tx = viewingTx;
                  setViewingTx(null);
                  setDeletingTx(tx);
                }}
                className="px-4 py-2 rounded-full bg-[#F17D8B]/20 hover:bg-[#F17D8B]/30 text-xs font-bold text-[#F17D8B]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Transaction Confirmation */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">
              Delete Transaction?
            </h3>
            <p className="text-xs text-[#A09BAE] mb-5">
              Deleting{' '}
              <span className="font-semibold text-[#F5F3FA]">
                {deletingTx.merchantName || deletingTx.description || 'this entry'} (
                {formatMoney(deletingTx.amount)})
              </span>{' '}
              will automatically reverse its impact on the associated account balance and recalculate budgets.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE] hover:text-[#F5F3FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-4 py-2 rounded-full bg-[#F17D8B] text-xs font-bold text-[#111014]"
              >
                Delete & Reconcile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: E. Create Custom Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              aria-label="Close category modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              Create Custom Category
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Organize transactions and budgets with a personalized category.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g., Cloud & SaaS Tools"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                  Category Type *
                </label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as CategoryType)}
                  className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                >
                  <option value="expense">Expense Category</option>
                  <option value="income">Income Category</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C8C3D8] mb-1.5">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        catColor === color
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
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: F. Create Recurring Schedule */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowRecurringModal(false)}
              aria-label="Close recurring modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              New Recurring Transaction
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Configure an automated schedule for recurring bills, subscriptions, or salary inflows.
            </p>

            <form onSubmit={handleCreateRecurring} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Type *
                  </label>
                  <select
                    value={recType}
                    onChange={(e) => {
                      const next = e.target.value as 'income' | 'expense';
                      setRecType(next);
                      const firstCat = categories.find((c) => c.categoryType === next);
                      setRecCategoryId(firstCat?.id ?? '');
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Frequency *
                  </label>
                  <select
                    value={recFrequency}
                    onChange={(e) =>
                      setRecFrequency(e.target.value as RecurringFrequency)
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Account *
                  </label>
                  <select
                    value={recAccountId}
                    onChange={(e) => setRecAccountId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    {accounts
                      .filter((a) => a.isActive)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Category
                  </label>
                  <select
                    value={recCategoryId}
                    onChange={(e) => setRecCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  >
                    {categories
                      .filter((c) => c.categoryType === recType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Merchant / Payee *
                  </label>
                  <input
                    type="text"
                    required
                    value={recMerchant}
                    onChange={(e) => setRecMerchant(e.target.value)}
                    placeholder="e.g., Netflix, Rent, Employer"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={recStartDate}
                    onChange={(e) => setRecStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                    Optional End Date
                  </label>
                  <input
                    type="date"
                    value={recEndDate}
                    onChange={(e) => setRecEndDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowRecurringModal(false)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: G. CSV Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              aria-label="Close export modal"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#F5F3FA] mb-1">
              Export Transactions to CSV
            </h3>
            <p className="text-xs text-[#A09BAE] mb-4">
              Choose which slice of your financial ledger to export.
            </p>

            <form onSubmit={handleDownloadCsv} className="space-y-4">
              <div className="space-y-2">
                {(
                  [
                    {
                      id: 'filtered',
                      label: `Current Filtered View (${filteredTransactions.length} rows)`,
                    },
                    {
                      id: 'all',
                      label: `All Ledger Transactions (${transactions.length} rows)`,
                    },
                    {
                      id: 'range',
                      label: 'Custom Date-Range Export',
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer text-xs font-medium transition-colors ${
                      exportScope === opt.id
                        ? 'bg-[#2B253A] border-[#A99BFF]/50 text-[#F5F3FA]'
                        : 'bg-[#211E2A] border-white/[0.06] text-[#A09BAE]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === opt.id}
                      onChange={() => setExportScope(opt.id)}
                      className="accent-[#A99BFF]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {exportScope === 'range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#C8C3D8] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl bg-[#211E2A] border border-white/[0.08] text-xs text-[#F5F3FA]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-full bg-[#24202F] text-xs font-semibold text-[#A09BAE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#A99BFF] to-[#8A7CF5] text-xs font-bold text-[#111014]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
