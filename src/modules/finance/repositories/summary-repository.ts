import { SupabaseClient } from '@supabase/supabase-js';
import { Database, PaymentMethod } from '@/types/database';

export interface RawPeriodTotals {
  totalIncome: string;
  totalExpenses: string;
}

export interface RawCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalAmount: string;
}

export interface RawPaymentMethodBreakdown {
  paymentMethod: PaymentMethod;
  totalAmount: string;
}

export interface RawDailyExpenditure {
  date: string;
  totalAmount: string;
}

export interface RawDailyCashFlow {
  date: string;
  totalIncome: string;
  totalExpenses: string;
}

export class SummaryRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async getPeriodTotals(
    userId: string,
    startDateIso: string,
    endDateIso: string,
    accountId?: string
  ): Promise<RawPeriodTotals> {
    let query = this.supabase
      .from('transactions')
      .select('transaction_type, amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', startDateIso)
      .lte('transaction_date', endDateIso);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to calculate period totals: ${error.message}`);
    }

    let incomeSum = 0;
    let expenseSum = 0;

    for (const row of data || []) {
      const amt = Number(row.amount);
      if (row.transaction_type === 'income') {
        incomeSum += amt;
      } else if (row.transaction_type === 'expense') {
        expenseSum += amt;
      }
    }

    return {
      totalIncome: incomeSum.toFixed(4),
      totalExpenses: expenseSum.toFixed(4),
    };
  }

  async getCategoryExpenditure(
    userId: string,
    startDateIso: string,
    endDateIso: string,
    accountId?: string
  ): Promise<RawCategoryBreakdown[]> {
    let query = this.supabase
      .from('transactions')
      .select(`
        category_id,
        amount,
        categories(name)
      `)
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .is('deleted_at', null)
      .gte('transaction_date', startDateIso)
      .lte('transaction_date', endDateIso);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get category expenditure: ${error.message}`);
    }

    const categoryMap = new Map<string, { name: string; sum: number }>();

    for (const row of (data as any[]) || []) {
      const catId = row.category_id || 'uncategorized';
      const catName = row.categories?.name || 'Uncategorized';
      const amt = Number(row.amount);

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.sum += amt;
      } else {
        categoryMap.set(catId, { name: catName, sum: amt });
      }
    }

    return Array.from(categoryMap.entries()).map(([id, val]) => ({
      categoryId: id,
      categoryName: val.name,
      totalAmount: val.sum.toFixed(4),
    }));
  }

  async getPaymentMethodExpenditure(
    userId: string,
    startDateIso: string,
    endDateIso: string,
    accountId?: string
  ): Promise<RawPaymentMethodBreakdown[]> {
    let query = this.supabase
      .from('transactions')
      .select('payment_method, amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .is('deleted_at', null)
      .gte('transaction_date', startDateIso)
      .lte('transaction_date', endDateIso);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get payment method expenditure: ${error.message}`);
    }

    const methodMap = new Map<PaymentMethod, number>();

    for (const row of data || []) {
      const method = row.payment_method;
      const amt = Number(row.amount);
      const curr = methodMap.get(method) || 0;
      methodMap.set(method, curr + amt);
    }

    return Array.from(methodMap.entries()).map(([method, sum]) => ({
      paymentMethod: method,
      totalAmount: sum.toFixed(4),
    }));
  }

  async getDailyExpenditure(
    userId: string,
    startDateIso: string,
    endDateIso: string,
    accountId?: string
  ): Promise<RawDailyExpenditure[]> {
    let query = this.supabase
      .from('transactions')
      .select('transaction_date, amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'expense')
      .is('deleted_at', null)
      .gte('transaction_date', startDateIso)
      .lte('transaction_date', endDateIso)
      .order('transaction_date', { ascending: true });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get daily expenditure: ${error.message}`);
    }

    const dailyMap = new Map<string, number>();

    for (const row of data || []) {
      const datePart = row.transaction_date.slice(0, 10); // YYYY-MM-DD
      const amt = Number(row.amount);
      const curr = dailyMap.get(datePart) || 0;
      dailyMap.set(datePart, curr + amt);
    }

    return Array.from(dailyMap.entries()).map(([date, sum]) => ({
      date,
      totalAmount: sum.toFixed(4),
    }));
  }

  /**
   * Returns the user's booked income and expenses by actual transaction date.
   * Transfer legs are intentionally ignored so they never inflate cash flow.
   */
  async getDailyCashFlow(
    userId: string,
    startDateIso: string,
    endDateIso: string,
    accountId?: string
  ): Promise<RawDailyCashFlow[]> {
    let query = this.supabase
      .from('transactions')
      .select('transaction_date, transaction_type, amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', startDateIso)
      .lte('transaction_date', endDateIso)
      .order('transaction_date', { ascending: true });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to get daily cash flow: ${error.message}`);
    }

    const dailyMap = new Map<string, { income: number; expenses: number }>();

    for (const row of data || []) {
      if (row.transaction_type !== 'income' && row.transaction_type !== 'expense') {
        continue;
      }

      const datePart = row.transaction_date.slice(0, 10);
      const current = dailyMap.get(datePart) || { income: 0, expenses: 0 };
      const amount = Number(row.amount);

      if (row.transaction_type === 'income') {
        current.income += amount;
      } else {
        current.expenses += amount;
      }

      dailyMap.set(datePart, current);
    }

    return Array.from(dailyMap.entries()).map(([date, totals]) => ({
      date,
      totalIncome: totals.income.toFixed(4),
      totalExpenses: totals.expenses.toFixed(4),
    }));
  }
}
