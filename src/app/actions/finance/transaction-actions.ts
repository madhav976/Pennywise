'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { CategoryService } from '@/modules/finance/services/category-service';
import { TransactionService } from '@/modules/finance/services/transaction-service';
import { TransferResultDTO, TransferService } from '@/modules/finance/services/transfer-service';
import {
  createTransactionSchema,
  CreateTransactionInput,
  createTransferSchema,
  CreateTransferInput,
  deleteTransactionSchema,
  DeleteTransactionInput,
  transactionFilterSchema,
  TransactionFilterInput,
  updateTransactionSchema,
  UpdateTransactionInput,
} from '@/modules/finance/validation/transaction-schemas';
import { PaginatedTransactionsDTO, TransactionDTO } from '@/types/finance';

type ContextResult =
  | {
      success: true;
      userId: string;
      transactionService: TransactionService;
      transferService: TransferService;
    }
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

  const categoryService = new CategoryService(categoryRepo);
  const transactionService = new TransactionService(transactionRepo, accountRepo, categoryService);
  const transferService = new TransferService(transactionRepo, accountRepo);

  return {
    success: true,
    userId: user.id,
    transactionService,
    transferService,
  };
}

export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<Result<TransactionDTO>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid transaction payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.transactionService.createTransaction(context.userId, parsed.data);
}

export async function createTransferAction(
  input: CreateTransferInput
): Promise<Result<TransferResultDTO>> {
  const parsed = createTransferSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid transfer payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.transferService.createTransfer(context.userId, parsed.data);
}

export async function updateTransactionAction(
  input: UpdateTransactionInput
): Promise<Result<TransactionDTO>> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid transaction update payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.transactionService.updateTransaction(context.userId, parsed.data);
}

export async function deleteTransactionAction(
  input: DeleteTransactionInput
): Promise<Result<{ id: string }>> {
  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid transaction deletion payload', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.transactionService.deleteTransaction(context.userId, parsed.data.transactionId);
}

export async function deleteTransferAction(
  transactionId: string
): Promise<Result<{ deletedIds: string[] }>> {
  const context = await getServices();
  if (!context.success) return context.error;

  return context.transferService.deleteTransfer(context.userId, transactionId);
}

export async function listTransactionsAction(
  filter: TransactionFilterInput
): Promise<Result<PaginatedTransactionsDTO>> {
  const parsed = transactionFilterSchema.safeParse(filter);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid transaction query parameters', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.transactionService.listTransactions(context.userId, parsed.data);
}
