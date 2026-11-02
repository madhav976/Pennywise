'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { RecurringRepository } from '@/modules/finance/repositories/recurring-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { CategoryService } from '@/modules/finance/services/category-service';
import { RecurringService } from '@/modules/finance/services/recurring-service';
import { TransactionService } from '@/modules/finance/services/transaction-service';
import { TransferService } from '@/modules/finance/services/transfer-service';
import {
  createRecurringSchema,
  CreateRecurringInput,
  updateRecurringSchema,
  UpdateRecurringInput,
} from '@/modules/finance/validation/recurring-schemas';
import { RecurringTransactionDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; recurringService: RecurringService }
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

  const accountRepo = new AccountRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);
  const transactionRepo = new TransactionRepository(supabase);
  const recurringRepo = new RecurringRepository(supabase);

  const categoryService = new CategoryService(categoryRepo);
  const transactionService = new TransactionService(transactionRepo, accountRepo, categoryService);
  const transferService = new TransferService(transactionRepo, accountRepo);
  const recurringService = new RecurringService(
    recurringRepo,
    accountRepo,
    transactionService,
    transferService
  );

  return { success: true, userId: user.id, recurringService };
}

export async function createRecurringAction(
  input: CreateRecurringInput
): Promise<Result<RecurringTransactionDTO>> {
  const parsed = createRecurringSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid recurring transaction payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.recurringService.createRecurring(context.userId, parsed.data);
}

export async function updateRecurringAction(
  input: UpdateRecurringInput
): Promise<Result<RecurringTransactionDTO>> {
  const parsed = updateRecurringSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid recurring update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.recurringService.updateRecurring(context.userId, parsed.data);
}

export async function toggleRecurringActiveAction(
  recurringId: string,
  isActive: boolean
): Promise<Result<RecurringTransactionDTO>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.recurringService.setScheduleActive(context.userId, recurringId, isActive);
}

export async function listRecurringAction(): Promise<Result<RecurringTransactionDTO[]>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.recurringService.listSchedules(context.userId);
}
