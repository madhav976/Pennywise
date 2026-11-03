'use server';

import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { roundMoney } from '@/lib/money';
import {
  Account,
  AccountType,
  ExpenseCategoryName,
  GoalContribution,
  ReceiptItemInput,
  ReceiptRecord,
  RecurringContribution,
  RecurringFrequency,
  SavingsGoal,
  Transaction,
  TransactionCategoryName,
  TransactionType,
} from '@/types/pennywise';

const AccountInputSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(60),
  accountType: z.enum(['salary', 'savings', 'cash', 'personal', 'credit', 'custom']),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  icon: z.string().min(1),
  description: z.string().max(160).optional(),
});

const TransactionInputSchema = z.object({
  accountId: z.string().min(1, 'Account selection is mandatory'),
  title: z.string().trim().min(1, 'Title is required').max(100),
  amount: z.number().positive('Amount must be greater than zero'),
  transactionType: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Category is required'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  taxAmount: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
  receipt: z
    .object({
      merchantName: z.string().min(1),
      receiptDate: z.string(),
      totalAmount: z.number().positive(),
      taxAmount: z.number().optional(),
      suggestedCategory: z.string(),
      receiptHash: z.string().min(1),
      rawOcrText: z.string().optional(),
      items: z.array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unitPrice: z.number().min(0),
          totalPrice: z.number().min(0),
        })
      ),
    })
    .optional(),
});

export async function fetchUserLedgerAction() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return { configured: false, authenticated: false, data: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { configured: true, authenticated: false, data: null };
  }

  const [
    accountsRes,
    transactionsRes,
    receiptsRes,
    receiptItemsRes,
    goalsRes,
    contributionsRes,
    recurringRes,
  ] = await Promise.all([
    supabase.from('accounts').select('*').order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('receipts').select('*').order('created_at', { ascending: false }),
    supabase.from('receipt_items').select('*'),
    supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
    supabase
      .from('goal_contributions')
      .select('*')
      .order('contribution_date', { ascending: false }),
    supabase.from('recurring_contributions').select('*'),
  ]);

  const itemsByReceipt = new Map<string, ReceiptItemInput[]>();
  for (const row of receiptItemsRes.data || []) {
    const list = itemsByReceipt.get(row.receipt_id) || [];
    list.push({
      id: row.id,
      name: row.item_name,
      quantity: Number(row.quantity),
      unitPrice: roundMoney(row.unit_price),
      totalPrice: roundMoney(row.total_price),
    });
    itemsByReceipt.set(row.receipt_id, list);
  }

  const accounts: Account[] = (accountsRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    accountType: r.account_type as AccountType,
    openingBalance: roundMoney(r.opening_balance),
    currentBalance: roundMoney(r.current_balance),
    icon: r.icon || 'Landmark',
    description: r.description || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const receipts: ReceiptRecord[] = (receiptsRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    merchantName: r.merchant_name,
    receiptDate: r.receipt_date,
    totalAmount: roundMoney(r.total_amount),
    taxAmount: r.tax_amount !== null ? roundMoney(r.tax_amount) : undefined,
    suggestedCategory: r.suggested_category as ExpenseCategoryName,
    imageUrl: r.image_path || undefined,
    receiptHash: r.receipt_hash,
    rawOcrText: r.raw_ocr_text || undefined,
    items: itemsByReceipt.get(r.id) || [],
    createdAt: r.created_at,
  }));

  const transactions: Transaction[] = (transactionsRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    accountId: r.account_id,
    receiptId: r.receipt_id || undefined,
    title: r.title,
    amount: roundMoney(r.amount),
    transactionType: r.transaction_type as TransactionType,
    category: r.category as TransactionCategoryName,
    transactionDate: r.transaction_date,
    taxAmount: r.tax_amount !== null ? roundMoney(r.tax_amount) : undefined,
    notes: r.notes || undefined,
    receiptItems: r.receipt_id ? itemsByReceipt.get(r.receipt_id) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const goals: SavingsGoal[] = (goalsRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    targetAmount: roundMoney(r.target_amount),
    savedAmount: roundMoney(r.saved_amount),
    targetDate: r.target_date || undefined,
    icon: r.icon || 'smartphone',
    imageUrl: r.image_url || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const contributions: GoalContribution[] = (contributionsRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    goalId: r.goal_id,
    sourceAccountId: r.source_account_id,
    recurringRuleId: r.recurring_rule_id || undefined,
    periodKey: r.period_key || undefined,
    amount: roundMoney(r.amount),
    contributionDate: r.contribution_date,
    notes: r.notes || undefined,
    createdAt: r.created_at,
  }));

  const recurringRules: RecurringContribution[] = (recurringRes.data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    goalId: r.goal_id,
    sourceAccountId: r.source_account_id,
    amount: roundMoney(r.amount),
    frequency: r.frequency as RecurringFrequency,
    startDate: r.start_date,
    nextRunDate: r.next_run_date,
    lastProcessedDate: r.last_processed_date || undefined,
    isEnabled: Boolean(r.is_enabled),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return {
    configured: true,
    authenticated: true,
    user: {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      currency: user.user_metadata?.currency || 'INR',
      createdAt: user.created_at,
    },
    data: {
      accounts,
      transactions,
      receipts,
      goals,
      contributions,
      recurringRules,
    },
  };
}

export async function createAccountServerAction(input: z.infer<typeof AccountInputSchema>) {
  const parsed = AccountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Invalid account data' };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { success: true, mode: 'local' as const };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const opening = roundMoney(parsed.data.openingBalance);
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      account_type: parsed.data.accountType,
      opening_balance: opening,
      current_balance: opening,
      icon: parsed.data.icon,
      description: parsed.data.description || null,
    })
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, mode: 'supabase' as const, id: data.id };
}

export async function createTransactionServerAction(
  input: z.infer<typeof TransactionInputSchema>
) {
  const parsed = TransactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Invalid transaction data',
    };
  }

  const supabase = await createServerSupabase();
  if (!supabase) return { success: true, mode: 'local' as const };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  let receiptId: string | null = null;

  if (parsed.data.receipt) {
    const r = parsed.data.receipt;
    const { data: receiptRow, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        merchant_name: r.merchantName,
        receipt_date: r.receiptDate,
        total_amount: roundMoney(r.totalAmount),
        tax_amount: r.taxAmount !== undefined ? roundMoney(r.taxAmount) : null,
        suggested_category: r.suggestedCategory,
        receipt_hash: r.receiptHash,
        raw_ocr_text: r.rawOcrText || null,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (receiptErr) {
      if (receiptErr.code === '23505') {
        return {
          success: false,
          error: 'This receipt has already been recorded to prevent duplicate expenses.',
        };
      }
      return { success: false, error: receiptErr.message };
    }

    receiptId = receiptRow.id;

    if (r.items.length > 0) {
      await supabase.from('receipt_items').insert(
        r.items.map((item) => ({
          receipt_id: receiptId,
          user_id: user.id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: roundMoney(item.unitPrice),
          total_price: roundMoney(item.totalPrice),
        }))
      );
    }
  }

  const { data: txRow, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: parsed.data.accountId,
      receipt_id: receiptId,
      title: parsed.data.title,
      amount: roundMoney(parsed.data.amount),
      transaction_type: parsed.data.transactionType,
      category: parsed.data.category,
      transaction_date: parsed.data.transactionDate,
      tax_amount:
        parsed.data.taxAmount !== undefined ? roundMoney(parsed.data.taxAmount) : null,
      notes: parsed.data.notes || null,
    })
    .select('id')
    .single();

  if (txErr) return { success: false, error: txErr.message };
  return { success: true, mode: 'supabase' as const, id: txRow.id, receiptId };
}

