'use client';

import React, { useEffect, useState } from 'react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TransactionCategoryName,
  TransactionType,
} from '@/types/pennywise';
import { usePennywise } from '@/context/pennywise-context';
import { getCategoryMeta } from '@/lib/categories';
import { formatCurrency, roundMoney } from '@/lib/money';
import { MobileBottomSheet, PwIcon, PwSpinner } from '@/components/ui/pw-icon';
import { Check, Edit3, Receipt, Trash2 } from 'lucide-react';

export function TransactionDetailSheet({
  transaction,
  onClose,
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const { user, accounts, updateTransaction, deleteTransaction } = usePennywise();
  const currency = user?.currency || 'INR';

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategoryName>('Food & Dining');
  const [accountId, setAccountId] = useState('');
  const [txDate, setTxDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setIsEditing(false);
      setConfirmDelete(false);
      setIsSavingEdit(false);
      setIsDeleting(false);
      setTitle(transaction.title);
      setAmount(String(transaction.amount));
      setTxType(transaction.transactionType);
      setCategory(transaction.category);
      setAccountId(transaction.accountId);
      setTxDate(transaction.transactionDate);
      setNotes(transaction.notes || '');
      setError(null);
    }
  }, [transaction]);

  if (!transaction) return null;

  const meta = getCategoryMeta(transaction.category);
  const account = accounts.find((a) => a.id === transaction.accountId);
  const availableCategories =
    txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction || isSavingEdit) return;
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!accountId) {
      setError('Account selection is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateTransaction(transaction.id, {
        accountId,
        title: title.trim(),
        amount: roundMoney(parsedAmount),
        transactionType: txType,
        category,
        transactionDate: txDate,
        taxAmount: transaction.taxAmount,
        notes: notes.trim() || undefined,
        receiptItems: transaction.receiptItems,
      });

      if (!res.ok) {
        setError(res.error || 'Could not update transaction.');
        return;
      }

      onClose();
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmDelete() {
    if (!transaction || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteTransaction(transaction.id);
      if (res.ok) {
        onClose();
      } else {
        setError(res.error || 'Could not delete transaction.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <MobileBottomSheet
      isOpen={Boolean(transaction)}
      onClose={onClose}
      title={isEditing ? 'Edit Transaction' : 'Transaction Details'}
      subtitle={
        isEditing
          ? 'Changes automatically recalculate your account balance'
          : `${transaction.transactionDate} · ${account?.name || 'Account'}`
      }
    >
      {error && (
        <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318]">
          {error}
        </div>
      )}

      {!isEditing ? (
        <div className="space-y-4 animate-viewEnter">
          {/* Summary Card */}
          <div className="bg-white rounded-[28px] p-5 border border-[#E7EBE5] text-center space-y-2">
            <div
              className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
              style={{ backgroundColor: meta.color }}
            >
              <PwIcon name={meta.icon} className="w-6 h-6" />
            </div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-[#EBF0E9] text-[11px] font-semibold text-[#191B19]">
              {transaction.category}
            </span>
            <h4 className="text-base font-semibold text-[#191B19]">
              {transaction.title}
            </h4>
            <p
              className={`text-2xl font-bold tracking-tight ${
                transaction.transactionType === 'income'
                  ? 'text-[#2E7D32]'
                  : 'text-[#191B19]'
              }`}
            >
              {transaction.transactionType === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount, currency)}
            </p>
          </div>

          {/* Metadata Breakdown */}
          <div className="bg-[#EBF0E9] rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#777F77]">Account Used</span>
              <span className="font-semibold text-[#191B19]">
                {account?.name || 'Linked Account'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777F77]">Transaction Date</span>
              <span className="font-semibold text-[#191B19]">
                {transaction.transactionDate}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#777F77]">Type</span>
              <span className="font-semibold capitalize text-[#191B19]">
                {transaction.transactionType}
              </span>
            </div>
            {transaction.taxAmount !== undefined && transaction.taxAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[#777F77]">Included Tax</span>
                <span className="font-semibold text-[#191B19]">
                  {formatCurrency(transaction.taxAmount, currency)}
                </span>
              </div>
            )}
            {transaction.notes && (
              <div className="pt-2 border-t border-[#D8DFD4]">
                <span className="text-[#777F77] block mb-0.5">Notes</span>
                <p className="font-medium text-[#191B19]">{transaction.notes}</p>
              </div>
            )}
          </div>

          {/* Scanned Receipt Items (if present) */}
          {transaction.receiptItems && transaction.receiptItems.length > 0 && (
            <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191B19]">
                <Receipt className="w-4 h-4" />
                <span>Scanned Receipt Items ({transaction.receiptItems.length})</span>
              </div>
              <div className="divide-y divide-[#E7EBE5]">
                {transaction.receiptItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-[#191B19]">
                        {item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[#777F77] ml-1.5">
                          × {item.quantity}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[#191B19]">
                      {formatCurrency(item.totalPrice, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons or Delete Confirmation */}
          {!confirmDelete ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="py-3.5 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-[#DFFF52]" />
                <span>Edit Transaction</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="py-3.5 rounded-full bg-white border border-[#F5C2C7] text-[#E5484D] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-[24px] bg-[#FFEFEF] border border-[#F5C2C7] space-y-3">
              <p className="text-xs font-semibold text-[#B42318]">
                Delete &ldquo;{transaction.title}&rdquo;?
              </p>
              <p className="text-[11px] text-[#B42318]/85">
                This will remove the transaction and automatically restore{' '}
                {formatCurrency(transaction.amount, currency)} to{' '}
                {account?.name || 'the account'}.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="py-2.5 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="py-2.5 rounded-full bg-[#E5484D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <PwSpinner className="w-3.5 h-3.5 text-white" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Confirm Delete'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveEdit} className="space-y-3.5 animate-viewEnter">
          <div className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                Title / Merchant *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm text-[#191B19]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm font-semibold text-[#191B19]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                Account *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance, currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategoryName)
                }
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs font-semibold text-[#191B19]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-xs text-[#191B19]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
              className="py-3.5 rounded-full bg-white border border-[#E7EBE5] text-xs font-semibold text-[#191B19] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="py-3.5 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSavingEdit ? (
                <PwSpinner className="w-4 h-4 text-[#DFFF52]" />
              ) : (
                <Check className="w-4 h-4 text-[#DFFF52]" />
              )}
              <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </MobileBottomSheet>
  );
}

