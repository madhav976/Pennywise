'use client';

import React, { useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import { ACCOUNT_ICONS, ACCOUNT_TYPE_METADATA, getCategoryMeta } from '@/lib/categories';
import { canSafelyDeleteAccount, formatCurrency, roundMoney } from '@/lib/money';
import { Account, AccountType, Transaction } from '@/types/pennywise';
import { MobileBottomSheet, PwIcon, PwSpinner } from '@/components/ui/pw-icon';
import { TransactionDetailSheet } from '@/components/transactions/transaction-detail-sheet';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Edit3,
  Landmark,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

const ACCOUNT_TYPES: AccountType[] = [
  'salary',
  'savings',
  'cash',
  'personal',
  'credit',
  'custom',
];

export function AccountsScreen() {
  const {
    user,
    accounts,
    transactions,
    contributions,
    goals,
    createAccount,
    updateAccount,
    deleteAccount,
    openAddFlow,
    setActiveTab,
    setTransactionFilters,
  } = usePennywise();

  const currency = user?.currency || 'INR';

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [inspectingAccount, setInspectingAccount] = useState<Account | null>(
    null
  );
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Async loading states for account operations
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('salary');
  const [openingBalance, setOpeningBalance] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [icon, setIcon] = useState('Landmark');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const combinedAvailableBalance = accounts.reduce(
    (sum, a) => sum + a.currentBalance,
    0
  );
  const totalSavedInGoals = goals.reduce((sum, g) => sum + g.savedAmount, 0);

  function openCreateAccountModal(preset?: {
    name: string;
    type: AccountType;
    icon: string;
  }) {
    setEditingAccount(null);
    setName(preset?.name || '');
    setAccountType(preset?.type || 'salary');
    setOpeningBalance('');
    setMonthlyIncome('');
    setIcon(preset?.icon || 'Landmark');
    setDescription('');
    setFormError(null);
    setConfirmDeleteId(null);
    setIsSavingAccount(false);
    setIsDeletingAccount(false);
    setIsModalOpen(true);
  }

  function openEditAccountModal(acc: Account) {
    setEditingAccount(acc);
    setName(acc.name);
    setAccountType(acc.accountType);
    setOpeningBalance(String(acc.openingBalance));
    setMonthlyIncome(acc.monthlyIncome ? String(acc.monthlyIncome) : '');
    setIcon(acc.icon || 'Landmark');
    setDescription(acc.description || '');
    setFormError(null);
    setConfirmDeleteId(null);
    setIsSavingAccount(false);
    setIsDeletingAccount(false);
    setIsModalOpen(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (isSavingAccount) return;
    setFormError(null);

    const parsedOpening = parseFloat(openingBalance || '0');
    if (isNaN(parsedOpening) || parsedOpening < 0) {
      setFormError('Opening balance must be 0 or greater.');
      return;
    }

    const parsedIncome = monthlyIncome.trim() ? parseFloat(monthlyIncome) : undefined;
    if (
      accountType === 'salary' &&
      parsedIncome !== undefined &&
      (isNaN(parsedIncome) || parsedIncome < 0)
    ) {
      setFormError('Monthly income must be 0 or greater.');
      return;
    }

    setIsSavingAccount(true);
    try {
      if (editingAccount) {
        const res = await updateAccount(editingAccount.id, {
          name,
          accountType,
          openingBalance: roundMoney(parsedOpening),
          icon,
          description: description.trim() || undefined,
        });
        if (!res.ok) {
          setFormError(res.error || 'Could not update account.');
          return;
        }
        setIsModalOpen(false);
        return;
      }

      const res = await createAccount({
        name,
        accountType,
        openingBalance: roundMoney(parsedOpening),
        monthlyIncome: accountType === 'salary' ? parsedIncome : undefined,
        icon,
        description: description.trim() || undefined,
      });

      if (!res.ok) {
        setFormError(res.error || 'Could not create account.');
        return;
      }

      setIsModalOpen(false);
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleConfirmDelete(accId: string) {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      const res = await deleteAccount(accId);
      if (res.ok) {
        setConfirmDeleteId(null);
        setIsModalOpen(false);
        if (inspectingAccount?.id === accId) {
          setInspectingAccount(null);
        }
      } else {
        setFormError(res.error || 'Cannot delete account.');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }

  // Compute detailed ledger math for an account
  function getAccountLedgerMath(accountId: string, openingBal: number) {
    let income = 0;
    let expenses = 0;
    let goalAllocations = 0;

    for (const tx of transactions) {
      if (tx.accountId !== accountId) continue;
      if (tx.transactionType === 'income') income += tx.amount;
      else expenses += tx.amount;
    }

    for (const c of contributions) {
      if (c.sourceAccountId === accountId) {
        goalAllocations += c.amount;
      }
    }

    return {
      opening: roundMoney(openingBal),
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      goalAllocations: roundMoney(goalAllocations),
      current: roundMoney(openingBal + income - expenses - goalAllocations),
    };
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Editorial Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DFFF52] text-[#191B19] flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#191B19]">
              Financial Accounts
            </h1>
            <p className="text-xs text-[#777F77] mt-0.5">
              Manage balances across banks, cards &amp; cash wallets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCreateAccountModal()}
          className="px-3.5 py-2 rounded-full bg-[#191B19] text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#DFFF52]" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Combined Balance Hero Card */}
      <div className="bg-[#202320] text-white rounded-[28px] p-5 shadow-pw-elevated space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/70">
            Combined Available Balance
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#DFFF52] text-[#191B19] text-[11px] font-semibold">
            {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
          </span>
        </div>

        <div>
          <p className="text-3xl font-normal tracking-tight text-white">
            {formatCurrency(combinedAvailableBalance, currency)}
          </p>
          {totalSavedInGoals > 0 && (
            <p className="text-[11px] text-[#B9D99B] mt-1">
              + {formatCurrency(totalSavedInGoals, currency)} allocated in Savings Goals
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => openAddFlow('manual')}
            className="py-2.5 px-3 rounded-full bg-[#DFFF52] text-[#191B19] text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Transaction</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateAccountModal()}
            className="py-2.5 px-3 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/15"
          >
            <span>New Account</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#DFFF52]" />
          </button>
        </div>
      </div>

      {/* Onboarding / Empty State or Account Cards */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-[28px] p-6 border border-[#E7EBE5] shadow-pw-card space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#DFFF52] mx-auto flex items-center justify-center text-[#191B19]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#191B19]">
              Set up your first financial account
            </h3>
            <p className="text-xs text-[#777F77] max-w-[260px] mx-auto">
              Every expense, income, and savings contribution is linked to an account. Choose a starter template below or create a custom account:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                name: 'Salary Account',
                type: 'salary' as AccountType,
                icon: 'Landmark',
                desc: 'Primary bank account',
              },
              {
                name: 'Savings Account',
                type: 'savings' as AccountType,
                icon: 'PiggyBank',
                desc: 'Reserve & savings',
              },
              {
                name: 'Cash Wallet',
                type: 'cash' as AccountType,
                icon: 'Wallet',
                desc: 'Physical cash on hand',
              },
              {
                name: 'Personal Account',
                type: 'personal' as AccountType,
                icon: 'CreditCard',
                desc: 'Everyday spending',
              },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => openCreateAccountModal(preset)}
                className="p-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] hover:border-[#191B19] text-left transition-all space-y-1.5"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19]">
                  <PwIcon name={preset.icon} className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-[#191B19]">
                  {preset.name}
                </p>
                <p className="text-[10px] text-[#777F77]">{preset.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const typeMeta =
              ACCOUNT_TYPE_METADATA[acc.accountType] ||
              ACCOUNT_TYPE_METADATA.custom;
            const math = getAccountLedgerMath(acc.id, acc.openingBalance);
            const accTxCount = transactions.filter(
              (t) => t.accountId === acc.id
            ).length;

            return (
              <div
                key={acc.id}
                onClick={() => setInspectingAccount(acc)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setInspectingAccount(acc);
                  }
                }}
                className="bg-white rounded-[28px] p-4 border border-[#E7EBE5] shadow-pw-card space-y-3.5 cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#EBF0E9] text-[#191B19] flex items-center justify-center shrink-0">
                      <PwIcon name={acc.icon} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#191B19] truncate">
                        {acc.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#EBF0E9] text-[10px] font-semibold text-[#777F77] mt-0.5">
                        {typeMeta.label}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditAccountModal(acc);
                    }}
                    aria-label={`Edit ${acc.name}`}
                    className="w-8 h-8 rounded-full bg-[#F5F7F3] border border-[#E7EBE5] flex items-center justify-center text-[#191B19]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Current Available Balance */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="text-[10px] font-medium text-[#777F77] block">
                      Current Available Balance
                    </span>
                    <span className="text-2xl font-normal tracking-tight text-[#191B19]">
                      {formatCurrency(acc.currentBalance, currency)}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#777F77]">
                    {accTxCount} {accTxCount === 1 ? 'tx' : 'txs'} →
                  </span>
                </div>

                {/* Compact Balance Formula Strip */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E7EBE5] text-[11px]">
                  <div>
                    <span className="text-[#777F77] block text-[10px]">
                      Opening
                    </span>
                    <span className="font-semibold text-[#191B19]">
                      {formatCurrency(math.opening, currency, { compact: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#777F77] block text-[10px]">
                      + Income
                    </span>
                    <span className="font-semibold text-[#2E7D32]">
                      {formatCurrency(math.income, currency, { compact: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#777F77] block text-[10px]">
                      - Outflow
                    </span>
                    <span className="font-semibold text-[#191B19]">
                      {formatCurrency(
                        math.expenses + math.goalAllocations,
                        currency,
                        { compact: true }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT SHEET */}
      <MobileBottomSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Create Financial Account'}
        subtitle="Configure account type, opening balance, and visual badge"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="bg-white rounded-[24px] p-5 border border-[#E7EBE5] shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salary Account, Cash Wallet"
                className="w-full h-12 px-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-medium text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Account Type *
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full h-12 px-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19] focus:outline-none focus:border-[#191B19] transition-all"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ACCOUNT_TYPE_METADATA[t].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                  Opening Balance ({currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#777F77]">
                    {currency === 'INR' ? '₹' : currency}
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 pl-8 pr-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Monthly Income Field for Salary Accounts */}
            {accountType === 'salary' && (
              <div className="pt-0.5 animate-fadeIn">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#191B19]">
                    Monthly Income ({currency})
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
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full h-12 pl-8 pr-3.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] focus:ring-1 focus:ring-[#191B19] transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#777F77] mt-1">
                  Saved as your account salary profile; opening balance remains unchanged.
                </p>
              </div>
            )}

            {/* Icon Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-2">
                Account Icon
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ACCOUNT_ICONS.map((item) => {
                  const selected = icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcon(item.id)}
                      className={`h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                        selected
                          ? 'bg-[#191B19] border-[#191B19] text-[#DFFF52] shadow-xs'
                          : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#191B19] hover:bg-white hover:border-[#191B19]'
                      }`}
                    >
                      <PwIcon name={item.id} className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#191B19] mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Primary HDFC salary checking account"
                className="w-full h-12 px-4 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-medium text-[#191B19] placeholder:text-[#9BA39B] focus:outline-none focus:border-[#191B19] transition-all"
              />
            </div>
          </div>

          {editingAccount && (
            <div className="pt-1">
              {(() => {
                const safety = canSafelyDeleteAccount(
                  editingAccount.id,
                  transactions,
                  contributions
                );
                if (!safety.allowed) {
                  return (
                    <div className="p-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-[11px] text-[#777F77]">
                      <strong className="text-[#191B19]">Protected Record:</strong>{' '}
                      {safety.reason}
                    </div>
                  );
                }
                return confirmDeleteId !== editingAccount.id ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(editingAccount.id)}
                    className="text-xs font-semibold text-[#E5484D] inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => handleConfirmDelete(editingAccount.id)}
                      className="px-3.5 py-2 rounded-full bg-[#E5484D] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDeletingAccount && <PwSpinner className="w-3.5 h-3.5 text-white" />}
                      <span>{isDeletingAccount ? 'Deleting...' : 'Confirm Delete'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3.5 py-2 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingAccount || isDeletingAccount}
            className="w-full py-4 rounded-full bg-[#191B19] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSavingAccount ? (
              <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
            ) : (
              <Check className="w-4 h-4 text-[#DFFF52]" />
            )}
            <span>
              {isSavingAccount
                ? 'Saving Account...'
                : editingAccount
                ? 'Save Account Changes'
                : 'Create Account'}
            </span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* ACCOUNT SPECIFIC LEDGER & TRANSACTIONS SHEET */}
      <MobileBottomSheet
        isOpen={Boolean(inspectingAccount)}
        onClose={() => setInspectingAccount(null)}
        title={inspectingAccount?.name || 'Account Ledger'}
        subtitle={
          inspectingAccount
            ? ACCOUNT_TYPE_METADATA[inspectingAccount.accountType]?.label
            : ''
        }
      >
        {inspectingAccount && (
          <div className="space-y-4">
            {(() => {
              const liveAcc =
                accounts.find((a) => a.id === inspectingAccount.id) ||
                inspectingAccount;
              const math = getAccountLedgerMath(
                liveAcc.id,
                liveAcc.openingBalance
              );
              const accTxs = transactions.filter(
                (t) => t.accountId === liveAcc.id
              );
              const accContribs = contributions.filter(
                (c) => c.sourceAccountId === liveAcc.id
              );

              return (
                <>
                  {/* Balance Equation Verification Card */}
                  <div className="bg-[#EBF0E9] rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#777F77]">Opening Balance</span>
                      <span className="font-semibold text-[#191B19]">
                        {formatCurrency(math.opening, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#777F77]">+ Recorded Income</span>
                      <span className="font-semibold text-[#2E7D32]">
                        +{formatCurrency(math.income, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#777F77]">- Recorded Expenses</span>
                      <span className="font-semibold text-[#191B19]">
                        -{formatCurrency(math.expenses, currency)}
                      </span>
                    </div>
                    {math.goalAllocations > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#777F77]">
                          - Savings Goal Allocations
                        </span>
                        <span className="font-semibold text-[#191B19]">
                          -{formatCurrency(math.goalAllocations, currency)}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#D8DFD4] flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#191B19]">
                        Current Balance
                      </span>
                      <span className="font-bold text-[#191B19]">
                        {formatCurrency(liveAcc.currentBalance, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingAccount(null);
                        openEditAccountModal(liveAcc);
                      }}
                      className="py-2.5 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
                    >
                      Edit Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransactionFilters({
                          month: 'all',
                          category: 'all',
                          accountId: liveAcc.id,
                          search: '',
                        });
                        setInspectingAccount(null);
                        setActiveTab('transactions');
                      }}
                      className="py-2.5 rounded-full bg-[#191B19] text-white text-xs font-semibold"
                    >
                      Filter in History
                    </button>
                  </div>

                  {/* Account Transactions */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[#191B19]">
                      Account Transactions ({accTxs.length})
                    </h4>
                    {accTxs.length === 0 ? (
                      <p className="text-xs text-[#777F77] py-3 text-center bg-white rounded-2xl border border-[#E7EBE5]">
                        No transactions recorded for this account yet.
                      </p>
                    ) : (
                      accTxs.slice(0, 8).map((tx) => {
                        const meta = getCategoryMeta(tx.category);
                        return (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="w-full p-3 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
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
                                <p className="text-[10px] text-[#777F77]">
                                  {tx.transactionDate} · {tx.category}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold shrink-0 ${
                                tx.transactionType === 'income'
                                  ? 'text-[#2E7D32]'
                                  : 'text-[#191B19]'
                              }`}
                            >
                              {tx.transactionType === 'income' ? '+' : '-'}
                              {formatCurrency(tx.amount, currency)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {accContribs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-[#191B19]">
                        Savings Goal Allocations ({accContribs.length})
                      </h4>
                      {accContribs.map((c) => {
                        const g = goals.find((goal) => goal.id === c.goalId);
                        return (
                          <div
                            key={c.id}
                            className="p-3 rounded-2xl bg-white border border-[#E7EBE5] flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-[#191B19]">
                                To: {g?.name || 'Savings Goal'}
                              </p>
                              <p className="text-[10px] text-[#777F77]">
                                {c.contributionDate}
                              </p>
                            </div>
                            <span className="font-semibold text-[#191B19]">
                              -{formatCurrency(c.amount, currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </MobileBottomSheet>

      <TransactionDetailSheet
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}

