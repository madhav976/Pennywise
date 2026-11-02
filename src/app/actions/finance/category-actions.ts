'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { CategoryService } from '@/modules/finance/services/category-service';
import {
  createCategorySchema,
  CreateCategoryInput,
  updateCategorySchema,
  UpdateCategoryInput,
} from '@/modules/finance/validation/category-schemas';
import { CategoryDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; categoryService: CategoryService }
  | { success: false; error: Result<never> };

async function getServices(): Promise<ContextResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: err('UNAUTHORIZED', 'Authentication session is invalid or expired'),
    };
  }

  const categoryRepo = new CategoryRepository(supabase);
  const categoryService = new CategoryService(categoryRepo);

  return { success: true, userId: user.id, categoryService };
}

export async function listCategoriesAction(): Promise<Result<CategoryDTO[]>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.categoryService.listCategories(context.userId);
}

export async function createCategoryAction(
  input: CreateCategoryInput
): Promise<Result<CategoryDTO>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid category creation payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.categoryService.createCategory(context.userId, parsed.data);
}

export async function updateCategoryAction(
  input: UpdateCategoryInput
): Promise<Result<CategoryDTO>> {
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid category update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.categoryService.updateCategory(context.userId, parsed.data);
}

export async function deleteCategoryAction(categoryId: string): Promise<Result<{ id: string }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.categoryService.deleteCategory(context.userId, categoryId);
}
