import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { TransactionDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { CreateTransferInput } from '../validation/transaction-schemas';
import { AccountService } from './account-service';

export interface TransferResultDTO {
  sourceTransaction: TransactionDTO;
  destinationTransaction: TransactionDTO;
}

export class TransferService {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly accountRepo: AccountRepository
  ) {}

  async createTransfer(
    userId: string,
    input: CreateTransferInput
  ): Promise<Result<TransferResultDTO>> {
    if (input.sourceAccountId === input.destinationAccountId) {
      return err('INVALID_TRANSFER', 'Source and destination accounts must be distinct');
    }

    // 1. Verify Both Accounts
    const sourceAccount = await this.accountRepo.findById(input.sourceAccountId, userId);
    if (!sourceAccount) {
      return err('SOURCE_ACCOUNT_NOT_FOUND', 'Source account not found or access denied');
    }
    if (!sourceAccount.is_active) {
      return err('SOURCE_ACCOUNT_INACTIVE', 'Cannot transfer from an inactive source account');
    }

    const destinationAccount = await this.accountRepo.findById(
      input.destinationAccountId,
      userId
    );
    if (!destinationAccount) {
      return err(
        'DESTINATION_ACCOUNT_NOT_FOUND',
        'Destination account not found or access denied'
      );
    }
    if (!destinationAccount.is_active) {
      return err(
        'DESTINATION_ACCOUNT_INACTIVE',
        'Cannot transfer to an inactive destination account'
      );
    }

    const formattedAmount = Money.from(input.amount).toDbString();

    try {
      // 2. Compute New Account Balances
      const newSourceBalance = AccountService.calculateBalanceDelta(
        sourceAccount.current_balance,
        sourceAccount.account_type,
        'transfer',
        'source',
        formattedAmount,
        'apply'
      );

      const newDestBalance = AccountService.calculateBalanceDelta(
        destinationAccount.current_balance,
        destinationAccount.account_type,
        'transfer',
        'destination',
        formattedAmount,
        'apply'
      );

      // 3. Create Leg 1: Source Leg
      const sourceTx = await this.transactionRepo.create({
        user_id: userId,
        account_id: input.sourceAccountId,
        category_id: null,
        transaction_type: 'transfer',
        amount: formattedAmount,
        currency: input.currency || sourceAccount.currency,
        description: input.description,
        payment_method: input.paymentMethod,
        transaction_date: input.transactionDate,
        notes: input.notes || null,
        reference_number: input.referenceNumber || null,
        transfer_role: 'source',
      });

      // 4. Create Leg 2: Destination Leg
      const destTx = await this.transactionRepo.create({
        user_id: userId,
        account_id: input.destinationAccountId,
        category_id: null,
        transaction_type: 'transfer',
        amount: formattedAmount,
        currency: input.currency || destinationAccount.currency,
        description: input.description,
        payment_method: input.paymentMethod,
        transaction_date: input.transactionDate,
        notes: input.notes || null,
        reference_number: input.referenceNumber || null,
        transfer_role: 'destination',
      });

      // 5. Cross-Link Transfer Legs
      await this.transactionRepo.linkTransferPair(sourceTx.id, destTx.id);

      // 6. Update Both Account Balances
      await this.accountRepo.updateBalance(sourceAccount.id, newSourceBalance);
      await this.accountRepo.updateBalance(destinationAccount.id, newDestBalance);

      return ok({
        sourceTransaction: this.mapToDTO(sourceTx, destTx.id),
        destinationTransaction: this.mapToDTO(destTx, sourceTx.id),
      });
    } catch (e: any) {
      return err('TRANSFER_CREATION_FAILED', e.message || 'Failed to complete account transfer');
    }
  }

  async deleteTransfer(
    userId: string,
    transactionId: string
  ): Promise<Result<{ deletedIds: string[] }>> {
    const tx = await this.transactionRepo.findById(transactionId, userId);
    if (!tx) {
      return err('TRANSACTION_NOT_FOUND', 'Transfer transaction not found or access denied');
    }

    if (tx.transaction_type !== 'transfer' || !tx.transfer_pair_id) {
      return err('NOT_A_TRANSFER', 'Transaction is not a linked transfer');
    }

    const pairedTx = await this.transactionRepo.findById(tx.transfer_pair_id, userId);
    if (!pairedTx) {
      return err('PAIRED_TRANSFER_NOT_FOUND', 'Paired transfer leg not found');
    }

    const sourceTx = tx.transfer_role === 'source' ? tx : pairedTx;
    const destTx = tx.transfer_role === 'destination' ? tx : pairedTx;

    const sourceAccount = await this.accountRepo.findById(sourceTx.account_id, userId);
    const destAccount = await this.accountRepo.findById(destTx.account_id, userId);

    if (!sourceAccount || !destAccount) {
      return err('ACCOUNT_NOT_FOUND', 'One or both transfer accounts not found');
    }

    try {
      // 1. Revert source account balance
      const restoredSourceBalance = AccountService.calculateBalanceDelta(
        sourceAccount.current_balance,
        sourceAccount.account_type,
        'transfer',
        'source',
        sourceTx.amount,
        'reverse'
      );
      await this.accountRepo.updateBalance(sourceAccount.id, restoredSourceBalance);

      // 2. Revert destination account balance
      const restoredDestBalance = AccountService.calculateBalanceDelta(
        destAccount.current_balance,
        destAccount.account_type,
        'transfer',
        'destination',
        destTx.amount,
        'reverse'
      );
      await this.accountRepo.updateBalance(destAccount.id, restoredDestBalance);

      // 3. Soft-delete both records
      await this.transactionRepo.softDelete(sourceTx.id, userId);
      await this.transactionRepo.softDelete(destTx.id, userId);

      return ok({ deletedIds: [sourceTx.id, destTx.id] });
    } catch (e: any) {
      return err('TRANSFER_DELETE_FAILED', e.message || 'Failed to neutralize transfer');
    }
  }

  private mapToDTO(tx: any, pairedId: string): TransactionDTO {
    return {
      id: tx.id,
      userId: tx.user_id,
      accountId: tx.account_id,
      categoryId: null,
      transactionType: 'transfer',
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      merchantName: tx.merchant_name,
      paymentMethod: tx.payment_method,
      transactionDate: tx.transaction_date,
      notes: tx.notes,
      referenceNumber: tx.reference_number,
      transferPairId: pairedId,
      transferRole: tx.transfer_role,
      recurringTransactionId: tx.recurring_transaction_id,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      deletedAt: tx.deleted_at,
    };
  }
}

