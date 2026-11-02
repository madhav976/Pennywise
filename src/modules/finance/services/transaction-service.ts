import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { PaginatedTransactionsDTO, TransactionDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import {
  CreateTransactionInput,
  TransactionFilterInput,
  UpdateTransactionInput,
} from '../validation/transaction-schemas';
import { AccountService } from './account-service';
import { CategoryService } from './category-service';

export class TransactionService {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly accountRepo: AccountRepository,
    private readonly categoryService: CategoryService
  ) {}

  async createTransaction(
    userId: string,
    input: CreateTransactionInput
  ): Promise<Result<TransactionDTO>> {
    // 1. Verify Account Ownership & Status
    const account = await this.accountRepo.findById(input.accountId, userId);
    if (!account) {
      return err('ACCOUNT_NOT_FOUND', 'Specified account does not exist or access is denied');
    }
    if (!account.is_active) {
      return err('ACCOUNT_INACTIVE', 'Cannot record transactions on an inactive account');
    }

    // 2. Validate Category Ownership & Compatibility
    const categoryCheck = await this.categoryService.validateCategoryForTransaction(
      input.categoryId,
      userId,
      input.transactionType
    );
    if (!categoryCheck.success) {
      return err(categoryCheck.error.code, categoryCheck.error.message);
    }

    // 3. Format Money Precision
    const formattedAmount = Money.from(input.amount).toDbString();

    try {
      // 4. Calculate New Account Balance
      const newBalance = AccountService.calculateBalanceDelta(
        account.current_balance,
        account.account_type,
        input.transactionType,
        null,
        formattedAmount,
        'apply'
      );

      // 5. Create Transaction Record
      const createdTx = await this.transactionRepo.create({
        user_id: userId,
        account_id: input.accountId,
        category_id: input.categoryId,
        transaction_type: input.transactionType,
        amount: formattedAmount,
        currency: input.currency || account.currency,
        description: input.description,
        merchant_name: input.merchantName || null,
        payment_method: input.paymentMethod,
        transaction_date: input.transactionDate,
        notes: input.notes || null,
        reference_number: input.referenceNumber || null,
        transfer_pair_id: null,
        transfer_role: null,
        recurring_transaction_id: null,
      });

      // 6. Update Account Balance
      await this.accountRepo.updateBalance(input.accountId, newBalance);

      return ok(this.mapToDTO(createdTx));
    } catch (e: any) {
      return err('TRANSACTION_CREATION_FAILED', e.message || 'Failed to create transaction');
    }
  }

  async updateTransaction(
    userId: string,
    input: UpdateTransactionInput
  ): Promise<Result<TransactionDTO>> {
    // 1. Fetch Existing Transaction
    const existing = await this.transactionRepo.findById(input.transactionId, userId);
    if (!existing) {
      return err('TRANSACTION_NOT_FOUND', 'Transaction not found or access denied');
    }

    if (existing.transaction_type === 'transfer') {
      return err(
        'USE_TRANSFER_SERVICE',
        'Transfers must be updated through the Transfer Service to maintain dual-leg consistency'
      );
    }

    // 2. Resolve Target Account
    const targetAccountId = input.accountId || existing.account_id;
    const oldAccount = await this.accountRepo.findById(existing.account_id, userId);
    if (!oldAccount) {
      return err('ACCOUNT_NOT_FOUND', 'Original transaction account not found');
    }

    const newAccount =
      targetAccountId === existing.account_id
        ? oldAccount
        : await this.accountRepo.findById(targetAccountId, userId);

    if (!newAccount) {
      return err('ACCOUNT_NOT_FOUND', 'Target transaction account not found');
    }

    // 3. Resolve & Validate Category
    const targetCategoryId =
      input.categoryId !== undefined ? input.categoryId : existing.category_id;
    if (targetCategoryId) {
      const categoryCheck = await this.categoryService.validateCategoryForTransaction(
        targetCategoryId,
        userId,
        existing.transaction_type as 'income' | 'expense'
      );
      if (!categoryCheck.success) {
        return err(categoryCheck.error.code, categoryCheck.error.message);
      }
    }

    const newAmount = input.amount
      ? Money.from(input.amount).toDbString()
      : existing.amount;

    try {
      // 4. Recalculate Balances
      if (oldAccount.id === newAccount.id) {
        // Revert old effect then apply new effect on same account
        let balance = AccountService.calculateBalanceDelta(
          oldAccount.current_balance,
          oldAccount.account_type,
          existing.transaction_type,
          null,
          existing.amount,
          'reverse'
        );
        balance = AccountService.calculateBalanceDelta(
          balance,
          newAccount.account_type,
          existing.transaction_type,
          null,
          newAmount,
          'apply'
        );
        await this.accountRepo.updateBalance(oldAccount.id, balance);
      } else {
        // Different accounts: Revert on old account, apply on new account
        const revertedOldBalance = AccountService.calculateBalanceDelta(
          oldAccount.current_balance,
          oldAccount.account_type,
          existing.transaction_type,
          null,
          existing.amount,
          'reverse'
        );
        await this.accountRepo.updateBalance(oldAccount.id, revertedOldBalance);

        const appliedNewBalance = AccountService.calculateBalanceDelta(
          newAccount.current_balance,
          newAccount.account_type,
          existing.transaction_type,
          null,
          newAmount,
          'apply'
        );
        await this.accountRepo.updateBalance(newAccount.id, appliedNewBalance);
      }

      // 5. Update Transaction
      const patch: Record<string, any> = {};
      if (input.accountId !== undefined) patch.account_id = input.accountId;
      if (input.categoryId !== undefined) patch.category_id = input.categoryId;
      if (input.amount !== undefined) patch.amount = newAmount;
      if (input.description !== undefined) patch.description = input.description;
      if (input.merchantName !== undefined) patch.merchant_name = input.merchantName;
      if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod;
      if (input.transactionDate !== undefined) patch.transaction_date = input.transactionDate;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.referenceNumber !== undefined) patch.reference_number = input.referenceNumber;

      const updatedTx = await this.transactionRepo.update(input.transactionId, userId, patch);
      return ok(this.mapToDTO(updatedTx));
    } catch (e: any) {
      return err('TRANSACTION_UPDATE_FAILED', e.message || 'Failed to update transaction');
    }
  }

  async deleteTransaction(
    userId: string,
    transactionId: string
  ): Promise<Result<{ id: string }>> {
    const existing = await this.transactionRepo.findById(transactionId, userId);
    if (!existing) {
      return err('TRANSACTION_NOT_FOUND', 'Transaction not found or access denied');
    }

    if (existing.transaction_type === 'transfer') {
      return err(
        'USE_TRANSFER_SERVICE',
        'Transfers must be deleted through the Transfer Service to neutralize both legs safely'
      );
    }

    const account = await this.accountRepo.findById(existing.account_id, userId);
    if (!account) {
      return err('ACCOUNT_NOT_FOUND', 'Linked account not found');
    }

    try {
      // 1. Reverse balance impact
      const reversedBalance = AccountService.calculateBalanceDelta(
        account.current_balance,
        account.account_type,
        existing.transaction_type,
        null,
        existing.amount,
        'reverse'
      );
      await this.accountRepo.updateBalance(account.id, reversedBalance);

      // 2. Perform Soft Delete
      await this.transactionRepo.softDelete(transactionId, userId);

      return ok({ id: transactionId });
    } catch (e: any) {
      return err('TRANSACTION_DELETE_FAILED', e.message || 'Failed to delete transaction');
    }
  }

  async listTransactions(
    userId: string,
    filter: TransactionFilterInput
  ): Promise<Result<PaginatedTransactionsDTO>> {
    try {
      const result = await this.transactionRepo.listFiltered(userId, filter);
      return ok(result);
    } catch (e: any) {
      return err('TRANSACTIONS_LIST_FAILED', e.message);
    }
  }

  private mapToDTO(tx: any): TransactionDTO {
    return {
      id: tx.id,
      userId: tx.user_id,
      accountId: tx.account_id,
      categoryId: tx.category_id,
      transactionType: tx.transaction_type,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      merchantName: tx.merchant_name,
      paymentMethod: tx.payment_method,
      transactionDate: tx.transaction_date,
      notes: tx.notes,
      referenceNumber: tx.reference_number,
      transferPairId: tx.transfer_pair_id,
      transferRole: tx.transfer_role,
      recurringTransactionId: tx.recurring_transaction_id,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      deletedAt: tx.deleted_at,
    };
  }
}

