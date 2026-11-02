import { SupabaseClient } from '@supabase/supabase-js';
import {
  Database,
  SavingsGoalContributionRow,
  SavingsGoalRow,
} from '@/types/database';

export class SavingsRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(goalId: string, userId: string): Promise<SavingsGoalRow | null> {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as SavingsGoalRow;
  }

  async listByUser(userId: string): Promise<SavingsGoalRow[]> {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('target_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to list savings goals: ${error.message}`);
    }
    return (data || []) as SavingsGoalRow[];
  }

  async create(
    goal: Database['public']['Tables']['savings_goals']['Insert']
  ): Promise<SavingsGoalRow> {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .insert(goal)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create savings goal: ${error?.message}`);
    }
    return data as SavingsGoalRow;
  }

  async update(
    goalId: string,
    userId: string,
    patch: Partial<SavingsGoalRow>
  ): Promise<SavingsGoalRow> {
    const { data, error } = await this.supabase
      .from('savings_goals')
      .update(patch)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update savings goal: ${error?.message}`);
    }
    return data as SavingsGoalRow;
  }

  async delete(goalId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('savings_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete savings goal: ${error.message}`);
    }
  }

  async listContributionsByUser(userId: string): Promise<SavingsGoalContributionRow[]> {
    const { data, error } = await this.supabase
      .from('savings_goal_contributions')
      .select('*')
      .eq('user_id', userId)
      .order('contribution_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to list goal contributions: ${error.message}`);
    }
    return (data || []) as SavingsGoalContributionRow[];
  }

  async createContribution(
    contribution: Database['public']['Tables']['savings_goal_contributions']['Insert']
  ): Promise<SavingsGoalContributionRow> {
    const { data, error } = await this.supabase
      .from('savings_goal_contributions')
      .insert(contribution)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record contribution: ${error?.message}`);
    }
    return data as SavingsGoalContributionRow;
  }
}

