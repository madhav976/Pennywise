import { SupabaseClient } from '@supabase/supabase-js';
import { Database, FinancialAccountRow } from '@/types/database';

export class AccountRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(accountId: string, userId: string): Promise<FinancialAccountRow | null> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data as FinancialAccountRow;
  }

  async listByUser(userId: string): Promise<FinancialAccountRow[]> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to list accounts: ${error.message}`);
    }
    return (data || []) as FinancialAccountRow[];
  }

  async create(
    account: Database['public']['Tables']['financial_accounts']['Insert']
  ): Promise<FinancialAccountRow> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .insert({
        ...account,
        current_balance: account.opening_balance,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create account: ${error?.message}`);
    }
    return data as FinancialAccountRow;
  }

  async update(
    accountId: string,
    userId: string,
    patch: Partial<FinancialAccountRow>
  ): Promise<FinancialAccountRow> {
    const { data, error } = await this.supabase
      .from('financial_accounts')
      .update(patch)
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update account: ${error?.message}`);
    }
    return data as FinancialAccountRow;
  }

  async delete(accountId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('financial_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }

  async updateBalance(accountId: string, newBalance: string): Promise<void> {
    const { error } = await this.supabase
      .from('financial_accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (error) {
      throw new Error(`Failed to update account balance: ${error.message}`);
    }
  }

  async reconcileBalance(accountId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('reconcile_account_balance', {
      p_account_id: accountId,
    });

    if (error) {
      throw new Error(`Failed to reconcile account balance: ${error.message}`);
    }
    return (data ?? '0.0000').toString();
  }
}
