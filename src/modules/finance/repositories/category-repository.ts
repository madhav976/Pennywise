import { SupabaseClient } from '@supabase/supabase-js';
import { CategoryRow, Database } from '@/types/database';

export class CategoryRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(categoryId: string, userId: string): Promise<CategoryRow | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .single();

    if (error || !data) {
      return null;
    }
    return data as CategoryRow;
  }

  async listAccessible(userId: string): Promise<CategoryRow[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list categories: ${error.message}`);
    }
    return (data || []) as CategoryRow[];
  }

  async create(category: Database['public']['Tables']['categories']['Insert']): Promise<CategoryRow> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create category: ${error?.message}`);
    }
    return data as CategoryRow;
  }

  async update(
    categoryId: string,
    userId: string,
    patch: Partial<CategoryRow>
  ): Promise<CategoryRow> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(patch)
      .eq('id', categoryId)
      .eq('user_id', userId)
      .eq('is_system', false)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update category: ${error?.message}`);
    }
    return data as CategoryRow;
  }

  async delete(categoryId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId)
      .eq('is_system', false);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }
}
