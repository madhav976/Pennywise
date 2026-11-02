'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { SavingsRepository } from '@/modules/finance/repositories/savings-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { SavingsService } from '@/modules/finance/services/savings-service';
import {
  contributeToGoalSchema,
  ContributeToGoalInput,
  createSavingsGoalSchema,
  CreateSavingsGoalInput,
  updateSavingsGoalSchema,
  UpdateSavingsGoalInput,
} from '@/modules/finance/validation/savings-schemas';
import { SavingsContributionDTO, SavingsGoalDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; savingsService: SavingsService }
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

  const savingsRepo = new SavingsRepository(supabase);
  const accountRepo = new AccountRepository(supabase);
  const transactionRepo = new TransactionRepository(supabase);
  const savingsService = new SavingsService(savingsRepo, accountRepo, transactionRepo);

  return { success: true, userId: user.id, savingsService };
}

export async function listSavingsGoalsAction(): Promise<Result<SavingsGoalDTO[]>> {
  const context = await getServices();
  if (!context.success) return context.error;
  return context.savingsService.listGoals(context.userId);
}

export async function createSavingsGoalAction(
  input: CreateSavingsGoalInput
): Promise<Result<SavingsGoalDTO>> {
  const parsed = createSavingsGoalSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid savings goal payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.savingsService.createGoal(context.userId, parsed.data);
}

export async function updateSavingsGoalAction(
  input: UpdateSavingsGoalInput
): Promise<Result<SavingsGoalDTO>> {
  const parsed = updateSavingsGoalSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid savings goal update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.savingsService.updateGoal(context.userId, parsed.data);
}

export async function deleteSavingsGoalAction(goalId: string): Promise<Result<{ id: string }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.savingsService.deleteGoal(goalId, context.userId);
}

export async function contributeToGoalAction(
  input: ContributeToGoalInput
): Promise<
  Result<{
    goal: SavingsGoalDTO;
    contribution: SavingsContributionDTO;
    updatedAccountBalance: string;
  }>
> {
  const parsed = contributeToGoalSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid contribution payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.savingsService.contributeToGoal(context.userId, parsed.data);
}

