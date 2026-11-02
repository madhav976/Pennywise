import { SupabaseClient } from '@supabase/supabase-js';
import { BudgetRow, Database } from '@/types/database';

export class BudgetRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(budgetId: string, userId: string): Promise<BudgetRow | null> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as BudgetRow;
  }

  async listByUser(userId: string): Promise<BudgetRow[]> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list budgets: ${error.message}`);
    }
    return (data || []) as BudgetRow[];
  }

  async create(
    budget: Database['public']['Tables']['budgets']['Insert']
  ): Promise<BudgetRow> {
    const { data, error } = await this.supabase
      .from('budgets')
      .insert(budget)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create budget: ${error?.message}`);
    }
    return data as BudgetRow;
  }

  async update(
    budgetId: string,
    userId: string,
    patch: Partial<BudgetRow>
  ): Promise<BudgetRow> {
    const { data, error } = await this.supabase
      .from('budgets')
      .update(patch)
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update budget: ${error?.message}`);
    }
    return data as BudgetRow;
  }

  async delete(budgetId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete budget: ${error.message}`);
    }
  }
}

