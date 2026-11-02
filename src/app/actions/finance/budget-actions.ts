'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BudgetRepository } from '@/modules/finance/repositories/budget-repository';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { BudgetService } from '@/modules/finance/services/budget-service';
import {
  createBudgetSchema,
  CreateBudgetInput,
  updateBudgetSchema,
  UpdateBudgetInput,
} from '@/modules/finance/validation/budget-schemas';
import { BudgetDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; budgetService: BudgetService }
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

  const budgetRepo = new BudgetRepository(supabase);
  const transactionRepo = new TransactionRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);
  const budgetService = new BudgetService(budgetRepo, transactionRepo, categoryRepo);

  return { success: true, userId: user.id, budgetService };
}

export async function listBudgetsAction(): Promise<Result<BudgetDTO[]>> {
  const context = await getServices();
  if (!context.success) return context.error;
  return context.budgetService.listBudgets(context.userId);
}

export async function createBudgetAction(input: CreateBudgetInput): Promise<Result<BudgetDTO>> {
  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid budget creation payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.budgetService.createBudget(context.userId, parsed.data);
}

export async function updateBudgetAction(input: UpdateBudgetInput): Promise<Result<BudgetDTO>> {
  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid budget update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.budgetService.updateBudget(context.userId, parsed.data);
}

export async function deleteBudgetAction(budgetId: string): Promise<Result<{ id: string }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.budgetService.deleteBudget(budgetId, context.userId);
}

