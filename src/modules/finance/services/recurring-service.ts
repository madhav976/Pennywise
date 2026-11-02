import { calculateNextExecutionDate } from '@/lib/dates';
import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { RecurringTransactionDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { RecurringRepository } from '../repositories/recurring-repository';
import {
  CreateRecurringInput,
  UpdateRecurringInput,
} from '../validation/recurring-schemas';
import { TransactionService } from './transaction-service';
import { TransferService } from './transfer-service';

export class RecurringService {
  constructor(
    private readonly recurringRepo: RecurringRepository,
    private readonly accountRepo: AccountRepository,
    private readonly transactionService: TransactionService,
    private readonly transferService: TransferService
  ) {}

  async createRecurring(
    userId: string,
    input: CreateRecurringInput
  ): Promise<Result<RecurringTransactionDTO>> {
    // 1. Verify Account Ownership
    const account = await this.accountRepo.findById(input.accountId, userId);
    if (!account) {
      return err('ACCOUNT_NOT_FOUND', 'Originating financial account not found or access denied');
    }

    if (input.transactionType === 'transfer') {
      if (!input.targetAccountId || input.targetAccountId === input.accountId) {
        return err(
          'INVALID_TRANSFER_TARGET',
          'Recurring transfers require a distinct target account'
        );
      }
      const targetAcc = await this.accountRepo.findById(input.targetAccountId, userId);
      if (!targetAcc) {
        return err('TARGET_ACCOUNT_NOT_FOUND', 'Target account not found or access denied');
      }
    }

    const formattedAmount = Money.from(input.amount).toDbString();

    try {
      const created = await this.recurringRepo.create({
        user_id: userId,
        account_id: input.accountId,
        category_id: input.categoryId || null,
        transaction_type: input.transactionType,
        target_account_id: input.targetAccountId || null,
        amount: formattedAmount,
        currency: input.currency || account.currency,
        description: input.description,
        merchant_name: input.merchantName || null,
        payment_method: input.paymentMethod,
        frequency: input.frequency,
        interval_count: input.intervalCount,
        start_date: input.startDate,
        end_date: input.endDate || null,
        next_execution_date: input.startDate,
        is_active: true,
      });

      return ok(this.mapToDTO(created));
    } catch (e: any) {
      return err('RECURRING_CREATION_FAILED', e.message || 'Failed to schedule recurring transaction');
    }
  }

  async updateRecurring(
    userId: string,
    input: UpdateRecurringInput
  ): Promise<Result<RecurringTransactionDTO>> {
    const existing = await this.recurringRepo.findById(input.recurringId, userId);
    if (!existing) {
      return err('RECURRING_NOT_FOUND', 'Recurring schedule not found or access denied');
    }

    const patch: Record<string, any> = {};
    if (input.amount !== undefined) patch.amount = Money.from(input.amount).toDbString();
    if (input.description !== undefined) patch.description = input.description;
    if (input.merchantName !== undefined) patch.merchant_name = input.merchantName;
    if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod;
    if (input.endDate !== undefined) patch.end_date = input.endDate;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    try {
      const updated = await this.recurringRepo.update(input.recurringId, userId, patch);
      return ok(this.mapToDTO(updated));
    } catch (e: any) {
      return err('RECURRING_UPDATE_FAILED', e.message || 'Failed to update recurring schedule');
    }
  }

  async setScheduleActive(
    userId: string,
    recurringId: string,
    isActive: boolean
  ): Promise<Result<RecurringTransactionDTO>> {
    return this.updateRecurring(userId, { recurringId, isActive });
  }

  async listSchedules(userId: string): Promise<Result<RecurringTransactionDTO[]>> {
    try {
      const schedules = await this.recurringRepo.listByUser(userId);
      return ok(schedules.map((s) => this.mapToDTO(s)));
    } catch (e: any) {
      return err('RECURRING_LIST_FAILED', e.message);
    }
  }

  /**
   * Idempotently processes all due recurring transactions across the system.
   * Can be called safely from background cron or scheduled edge route handlers.
   */
  async processDueSchedules(
    asOfDate?: string
  ): Promise<{ processed: number; failures: number; errors: Array<{ id: string; error: string }> }> {
    const todayStr = asOfDate || new Date().toISOString().slice(0, 10);
    const dueItems = await this.recurringRepo.findDue(todayStr);

    let processed = 0;
    let failures = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of dueItems) {
      try {
        let generatedTxId: string | null = null;
        const executionIsoDate = new Date(item.next_execution_date + 'T12:00:00Z').toISOString();

        if (item.transaction_type === 'transfer' && item.target_account_id) {
          const transferRes = await this.transferService.createTransfer(item.user_id, {
            sourceAccountId: item.account_id,
            destinationAccountId: item.target_account_id,
            amount: item.amount,
            currency: item.currency,
            description: `[Recurring] ${item.description}`,
            paymentMethod: item.payment_method,
            transactionDate: executionIsoDate,
            notes: 'Generated automatically from recurring schedule',
            referenceNumber: null,
          });

          if (!transferRes.success) {
            throw new Error(transferRes.error.message);
          }
          generatedTxId = transferRes.data.sourceTransaction.id;
        } else if (item.category_id) {
          const txRes = await this.transactionService.createTransaction(item.user_id, {
            accountId: item.account_id,
            categoryId: item.category_id,
            transactionType: item.transaction_type as 'income' | 'expense',
            amount: item.amount,
            currency: item.currency,
            description: `[Recurring] ${item.description}`,
            merchantName: item.merchant_name,
            paymentMethod: item.payment_method,
            transactionDate: executionIsoDate,
            notes: 'Generated automatically from recurring schedule',
            referenceNumber: null,
          });

          if (!txRes.success) {
            throw new Error(txRes.error.message);
          }
          generatedTxId = txRes.data.id;
        }

        // Advance next execution date
        const currentExecDate = new Date(item.next_execution_date + 'T00:00:00Z');
        const nextDate = calculateNextExecutionDate(
          currentExecDate,
          item.frequency,
          item.interval_count
        );
        const nextDateStr = nextDate.toISOString().slice(0, 10);

        // Check if next date exceeds end_date
        const isPastEnd = item.end_date && nextDateStr > item.end_date;

        await this.recurringRepo.advanceNextExecution(
          item.id,
          nextDateStr,
          new Date().toISOString()
        );

        if (isPastEnd) {
          await this.recurringRepo.update(item.id, item.user_id, { is_active: false });
        }

        // Record execution log for idempotency
        await this.recurringRepo.logExecution({
          recurring_transaction_id: item.id,
          executed_date: item.next_execution_date,
          generated_transaction_id: generatedTxId,
          status: 'success',
          error_message: null,
        });

        processed++;
      } catch (err: any) {
        failures++;
        errors.push({ id: item.id, error: err.message || 'Execution failed' });

        // Record failure log
        try {
          await this.recurringRepo.logExecution({
            recurring_transaction_id: item.id,
            executed_date: item.next_execution_date,
            generated_transaction_id: null,
            status: 'failed',
            error_message: err.message || 'Execution error',
          });
        } catch {
          // Log duplicate ignore
        }
      }
    }

    return { processed, failures, errors };
  }

  private mapToDTO(row: any): RecurringTransactionDTO {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      categoryId: row.category_id,
      transactionType: row.transaction_type,
      targetAccountId: row.target_account_id,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      merchantName: row.merchant_name,
      paymentMethod: row.payment_method,
      frequency: row.frequency,
      intervalCount: row.interval_count,
      startDate: row.start_date,
      endDate: row.end_date,
      nextExecutionDate: row.next_execution_date,
      lastExecutedAt: row.last_executed_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

