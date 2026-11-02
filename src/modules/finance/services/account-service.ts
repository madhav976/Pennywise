import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { AccountDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { CreateAccountInput, UpdateAccountInput } from '../validation/account-schemas';

export class AccountService {
  constructor(private readonly accountRepo: AccountRepository) {}

  /**
   * Evaluates if an account is a liability account (Debt-based).
   */
  static isLiability(accountType: string): boolean {
    return accountType === 'credit_card' || accountType === 'loan';
  }

  /**
   * Applies a transaction delta to an account's balance using exact decimal math.
   */
  static calculateBalanceDelta(
    currentBalance: string,
    accountType: string,
    transactionType: 'income' | 'expense' | 'transfer',
    transferRole: 'source' | 'destination' | null,
    amount: string,
    operation: 'apply' | 'reverse'
  ): string {
    const cur = Money.from(currentBalance);
    const amt = Money.from(amount);
    const isLiab = AccountService.isLiability(accountType);

    let delta: Money;

    if (transactionType === 'income') {
      delta = isLiab ? amt.negate() : amt;
    } else if (transactionType === 'expense') {
      delta = isLiab ? amt : amt.negate();
    } else if (transactionType === 'transfer') {
      if (transferRole === 'source') {
        delta = isLiab ? amt : amt.negate();
      } else if (transferRole === 'destination') {
        delta = isLiab ? amt.negate() : amt;
      } else {
        delta = Money.zero();
      }
    } else {
      delta = Money.zero();
    }

    if (operation === 'reverse') {
      delta = delta.negate();
    }

    return cur.add(delta).toDbString();
  }

  async getAccount(accountId: string, userId: string): Promise<Result<AccountDTO>> {
    const account = await this.accountRepo.findById(accountId, userId);
    if (!account) {
      return err('ACCOUNT_NOT_FOUND', 'Financial account not found or access denied');
    }
    return ok(this.mapToDTO(account));
  }

  async listAccounts(userId: string): Promise<Result<AccountDTO[]>> {
    const accounts = await this.accountRepo.listByUser(userId);
    return ok(accounts.map((a) => this.mapToDTO(a)));
  }

  async createAccount(userId: string, input: CreateAccountInput): Promise<Result<AccountDTO>> {
    try {
      const opening = Money.from(input.openingBalance || '0.0000').toDbString();
      const creditLimit = input.creditLimit ? Money.from(input.creditLimit).toDbString() : null;

      const created = await this.accountRepo.create({
        user_id: userId,
        account_name: input.accountName,
        account_type: input.accountType,
        institution_name: input.institutionName || null,
        currency: input.currency,
        opening_balance: opening,
        credit_limit: creditLimit,
        description: input.description || null,
        color: input.color || '#A99BFF',
        icon: input.icon || 'credit-card',
        is_active: true,
      });

      return ok(this.mapToDTO(created));
    } catch (e: any) {
      return err('ACCOUNT_CREATION_FAILED', e.message || 'Failed to create financial account');
    }
  }

  async updateAccount(userId: string, input: UpdateAccountInput): Promise<Result<AccountDTO>> {
    try {
      const existing = await this.accountRepo.findById(input.accountId, userId);
      if (!existing) {
        return err('ACCOUNT_NOT_FOUND', 'Financial account not found or access denied');
      }

      const patch: Record<string, any> = {};
      if (input.accountName !== undefined) patch.account_name = input.accountName;
      if (input.accountType !== undefined) patch.account_type = input.accountType;
      if (input.institutionName !== undefined) patch.institution_name = input.institutionName;
      if (input.creditLimit !== undefined) {
        patch.credit_limit = input.creditLimit ? Money.from(input.creditLimit).toDbString() : null;
      }
      if (input.description !== undefined) patch.description = input.description;
      if (input.color !== undefined) patch.color = input.color;
      if (input.icon !== undefined) patch.icon = input.icon;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const updated = await this.accountRepo.update(input.accountId, userId, patch);
      return ok(this.mapToDTO(updated));
    } catch (e: any) {
      return err('ACCOUNT_UPDATE_FAILED', e.message || 'Failed to update financial account');
    }
  }

  async deleteAccount(accountId: string, userId: string): Promise<Result<{ id: string }>> {
    try {
      const existing = await this.accountRepo.findById(accountId, userId);
      if (!existing) {
        return err('ACCOUNT_NOT_FOUND', 'Financial account not found or access denied');
      }
      await this.accountRepo.delete(accountId, userId);
      return ok({ id: accountId });
    } catch (e: any) {
      return err(
        'ACCOUNT_DELETE_FAILED',
        e.message || 'Cannot delete account with existing transactions; deactivate it instead.'
      );
    }
  }

  async reconcileAccount(
    accountId: string,
    userId: string
  ): Promise<Result<{ reconciledBalance: string }>> {
    const existing = await this.accountRepo.findById(accountId, userId);
    if (!existing) {
      return err('ACCOUNT_NOT_FOUND', 'Financial account not found');
    }

    try {
      const reconciled = await this.accountRepo.reconcileBalance(accountId);
      return ok({ reconciledBalance: reconciled });
    } catch (e: any) {
      return err('RECONCILIATION_FAILED', e.message || 'Account reconciliation failed');
    }
  }

  private mapToDTO(account: any): AccountDTO {
    let availableCredit: string | null = null;
    if (account.account_type === 'credit_card' && account.credit_limit !== null) {
      const limit = Money.from(account.credit_limit);
      const currentDebt = Money.from(account.current_balance);
      availableCredit = limit.subtract(currentDebt).toDbString();
    }

    return {
      id: account.id,
      userId: account.user_id,
      accountName: account.account_name,
      accountType: account.account_type,
      institutionName: account.institution_name,
      currency: account.currency,
      openingBalance: account.opening_balance,
      currentBalance: account.current_balance,
      creditLimit: account.credit_limit,
      availableCredit,
      description: account.description ?? null,
      color: account.color ?? '#A99BFF',
      icon: account.icon ?? 'credit-card',
      isActive: account.is_active,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }
}
