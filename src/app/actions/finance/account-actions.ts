'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { AccountService } from '@/modules/finance/services/account-service';
import {
  createAccountSchema,
  CreateAccountInput,
  updateAccountSchema,
  UpdateAccountInput,
} from '@/modules/finance/validation/account-schemas';
import { AccountDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; accountService: AccountService }
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
  const accountService = new AccountService(accountRepo);

  return { success: true, userId: user.id, accountService };
}

export async function createAccountAction(input: CreateAccountInput): Promise<Result<AccountDTO>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid account creation payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.createAccount(context.userId, parsed.data);
}

export async function updateAccountAction(input: UpdateAccountInput): Promise<Result<AccountDTO>> {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid account update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.updateAccount(context.userId, parsed.data);
}

export async function deleteAccountAction(accountId: string): Promise<Result<{ id: string }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.deleteAccount(accountId, context.userId);
}

export async function listAccountsAction(): Promise<Result<AccountDTO[]>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.listAccounts(context.userId);
}

export async function getAccountAction(accountId: string): Promise<Result<AccountDTO>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.getAccount(accountId, context.userId);
}

export async function reconcileAccountAction(
  accountId: string
): Promise<Result<{ reconciledBalance: string }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.accountService.reconcileAccount(accountId, context.userId);
}
