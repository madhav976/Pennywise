import { SupabaseClient } from '@supabase/supabase-js';
import { Database, RecurringTransactionRow } from '@/types/database';

export class RecurringRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(id: string, userId: string): Promise<RecurringTransactionRow | null> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data as RecurringTransactionRow;
  }

  async listByUser(userId: string): Promise<RecurringTransactionRow[]> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('next_execution_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to list recurring transactions: ${error.message}`);
    }
    return (data || []) as RecurringTransactionRow[];
  }

  async findDue(currentDate: string): Promise<RecurringTransactionRow[]> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution_date', currentDate)
      .or(`end_date.is.null,end_date.gte.${currentDate}`);

    if (error) {
      throw new Error(`Failed to fetch due recurring transactions: ${error.message}`);
    }
    return (data || []) as RecurringTransactionRow[];
  }

  async create(
    rec: Database['public']['Tables']['recurring_transactions']['Insert']
  ): Promise<RecurringTransactionRow> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .insert(rec)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create recurring transaction: ${error?.message}`);
    }
    return data as RecurringTransactionRow;
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<RecurringTransactionRow>
  ): Promise<RecurringTransactionRow> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update recurring transaction: ${error?.message}`);
    }
    return data as RecurringTransactionRow;
  }

  async advanceNextExecution(id: string, nextDate: string, lastExecutedAt: string): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_transactions')
      .update({
        next_execution_date: nextDate,
        last_executed_at: lastExecutedAt,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to advance next execution date: ${error.message}`);
    }
  }

  async logExecution(
    log: Database['public']['Tables']['recurring_transaction_logs']['Insert']
  ): Promise<void> {
    const { error } = await this.supabase
      .from('recurring_transaction_logs')
      .insert(log);

    if (error) {
      // If error is duplicate key (already logged for that date), propagate code
      throw error;
    }
  }
}
