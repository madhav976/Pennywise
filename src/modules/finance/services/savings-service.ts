import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { SavingsGoalContributionRow, SavingsGoalRow } from '@/types/database';
import { SavingsContributionDTO, SavingsGoalDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { SavingsRepository } from '../repositories/savings-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import {
  ContributeToGoalInput,
  CreateSavingsGoalInput,
  UpdateSavingsGoalInput,
} from '../validation/savings-schemas';
import { AccountService } from './account-service';

export class SavingsService {
  constructor(
    private readonly savingsRepo: SavingsRepository,
    private readonly accountRepo: AccountRepository,
    private readonly transactionRepo: TransactionRepository
  ) {}

  /**
   * Computes remaining amount, progress percentage, days remaining, and
   * estimated monthly contribution required to reach the goal by its targetDate.
   */
  static computeGoalMetrics(
    goal: {
      targetAmount: string;
      currentAmount: string;
      targetDate: string;
      status: SavingsGoalDTO['status'];
    },
    now = new Date()
  ): {
    remainingAmount: string;
    progressPercentage: number;
    daysRemaining: number;
    estimatedMonthlyRequired: string;
  } {
    const target = Money.from(goal.targetAmount);
    const current = Money.from(goal.currentAmount);
    const rawRemaining = target.subtract(current);
    const remaining = rawRemaining.isPositive() ? rawRemaining : Money.zero();

    const progressPercentage = target.isPositive()
      ? Math.min(100, Number(current.divide(target).multiply(100).toNumber().toFixed(2)))
      : 0;

    const targetTime = new Date(`${goal.targetDate.slice(0, 10)}T23:59:59.000Z`).getTime();
    const diffMs = targetTime - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let estimatedMonthlyRequired = Money.zero();
    if (remaining.isPositive() && goal.status !== 'completed') {
      if (daysRemaining <= 0) {
        // Overdue or due today: full remaining amount is needed immediately
        estimatedMonthlyRequired = remaining;
      } else {
        const monthsRemaining = Math.max(1, daysRemaining / 30.4375);
        estimatedMonthlyRequired = remaining.divide(monthsRemaining);
      }
    }

    return {
      remainingAmount: remaining.toDbString(),
      progressPercentage,
      daysRemaining,
      estimatedMonthlyRequired: estimatedMonthlyRequired.toDbString(),
    };
  }

  async listGoals(userId: string): Promise<Result<SavingsGoalDTO[]>> {
    try {
      const [rows, contributions, accounts] = await Promise.all([
        this.savingsRepo.listByUser(userId),
        this.savingsRepo.listContributionsByUser(userId),
        this.accountRepo.listByUser(userId),
      ]);

      const accountNameMap = new Map(accounts.map((a) => [a.id, a.account_name]));
      const contribsByGoal = new Map<string, SavingsContributionDTO[]>();

      for (const c of contributions) {
        const list = contribsByGoal.get(c.goal_id) || [];
        list.push(this.mapContributionToDTO(c, accountNameMap.get(c.source_account_id)));
        contribsByGoal.set(c.goal_id, list);
      }

      return ok(rows.map((row) => this.mapRowToDTO(row, contribsByGoal.get(row.id) || [])));
    } catch (e: any) {
      return err('SAVINGS_GOALS_LIST_FAILED', e.message || 'Failed to list savings goals');
    }
  }

  async createGoal(
    userId: string,
    input: CreateSavingsGoalInput
  ): Promise<Result<SavingsGoalDTO>> {
    try {
      const target = Money.from(input.targetAmount);
      const initial = Money.from(input.initialAmount || '0.0000');
      const isAlreadyCompleted = initial.greaterThanOrEqualTo(target);

      const created = await this.savingsRepo.create({
        user_id: userId,
        name: input.name,
        category: input.category,
        target_amount: target.toDbString(),
        initial_amount: initial.toDbString(),
        current_amount: initial.toDbString(),
        currency: input.currency,
        target_date: input.targetDate,
        description: input.description || null,
        icon: input.icon || 'target',
        color: input.color || '#A99BFF',
        status: isAlreadyCompleted ? 'completed' : 'active',
        completed_at: isAlreadyCompleted ? new Date().toISOString() : null,
      });

      return ok(this.mapRowToDTO(created, []));
    } catch (e: any) {
      return err('SAVINGS_GOAL_CREATION_FAILED', e.message || 'Failed to create savings goal');
    }
  }

  async updateGoal(
    userId: string,
    input: UpdateSavingsGoalInput
  ): Promise<Result<SavingsGoalDTO>> {
    try {
      const existing = await this.savingsRepo.findById(input.goalId, userId);
      if (!existing) {
        return err('SAVINGS_GOAL_NOT_FOUND', 'Savings goal not found or access denied');
      }

      const patch: Partial<SavingsGoalRow> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.category !== undefined) patch.category = input.category;
      if (input.targetAmount !== undefined) {
        patch.target_amount = Money.from(input.targetAmount).toDbString();
      }
      if (input.targetDate !== undefined) patch.target_date = input.targetDate;
      if (input.description !== undefined) patch.description = input.description;
      if (input.icon !== undefined) patch.icon = input.icon;
      if (input.color !== undefined) patch.color = input.color;
      if (input.status !== undefined) {
        patch.status = input.status;
        if (input.status === 'completed' && !existing.completed_at) {
          patch.completed_at = new Date().toISOString();
        }
      }

      const updated = await this.savingsRepo.update(input.goalId, userId, patch);
      return ok(this.mapRowToDTO(updated, []));
    } catch (e: any) {
      return err('SAVINGS_GOAL_UPDATE_FAILED', e.message || 'Failed to update savings goal');
    }
  }

  async deleteGoal(goalId: string, userId: string): Promise<Result<{ id: string }>> {
    try {
      const existing = await this.savingsRepo.findById(goalId, userId);
      if (!existing) {
        return err('SAVINGS_GOAL_NOT_FOUND', 'Savings goal not found or access denied');
      }
      await this.savingsRepo.delete(goalId, userId);
      return ok({ id: goalId });
    } catch (e: any) {
      return err('SAVINGS_GOAL_DELETE_FAILED', e.message || 'Failed to delete savings goal');
    }
  }

  /**
   * Records a savings contribution and atomically deducts from the source account
   * using an internal earmarked transfer ledger record (so it does NOT inflate expenses).
   */
  async contributeToGoal(
    userId: string,
    input: ContributeToGoalInput
  ): Promise<
    Result<{
      goal: SavingsGoalDTO;
      contribution: SavingsContributionDTO;
      updatedAccountBalance: string;
    }>
  > {
    const goal = await this.savingsRepo.findById(input.goalId, userId);
    if (!goal) {
      return err('SAVINGS_GOAL_NOT_FOUND', 'Savings goal not found or access denied');
    }
    if (goal.status === 'paused') {
      return err('SAVINGS_GOAL_PAUSED', 'Resume this savings goal before adding contributions');
    }

    const sourceAccount = await this.accountRepo.findById(input.sourceAccountId, userId);
    if (!sourceAccount) {
      return err('SOURCE_ACCOUNT_NOT_FOUND', 'Selected source account not found');
    }
    if (!sourceAccount.is_active) {
      return err('SOURCE_ACCOUNT_INACTIVE', 'Cannot contribute from an inactive account');
    }
    if (sourceAccount.currency !== goal.currency) {
      return err(
        'CURRENCY_MISMATCH',
        `Source account currency (${sourceAccount.currency}) must match goal currency (${goal.currency})`
      );
    }

    const contribAmount = Money.from(input.amount);
    const formattedAmount = contribAmount.toDbString();

    try {
      // 1. Deduct from source account via transfer source leg (does not count as expense)
      const newAccountBalance = AccountService.calculateBalanceDelta(
        sourceAccount.current_balance,
        sourceAccount.account_type,
        'transfer',
        'source',
        formattedAmount,
        'apply'
      );

      const ledgerTx = await this.transactionRepo.create({
        user_id: userId,
        account_id: sourceAccount.id,
        category_id: null,
        transaction_type: 'transfer',
        amount: formattedAmount,
        currency: goal.currency,
        description: `Savings Goal Contribution: ${goal.name}`,
        merchant_name: goal.name,
        payment_method: 'bank_transfer',
        transaction_date: input.contributionDate,
        notes: input.notes || null,
        transfer_role: 'source',
      });

      await this.accountRepo.updateBalance(sourceAccount.id, newAccountBalance);

      // 2. Record contribution and update goal saved amount
      const createdContrib = await this.savingsRepo.createContribution({
        goal_id: goal.id,
        user_id: userId,
        source_account_id: sourceAccount.id,
        transaction_id: ledgerTx.id,
        amount: formattedAmount,
        currency: goal.currency,
        contribution_date: input.contributionDate,
        notes: input.notes || null,
      });

      const newSavedAmount = Money.from(goal.current_amount).add(contribAmount);
      const targetAmount = Money.from(goal.target_amount);
      const reachedTarget = newSavedAmount.greaterThanOrEqualTo(targetAmount);

      const updatedGoal = await this.savingsRepo.update(goal.id, userId, {
        current_amount: newSavedAmount.toDbString(),
        status: reachedTarget ? 'completed' : goal.status,
        completed_at:
          reachedTarget && !goal.completed_at ? new Date().toISOString() : goal.completed_at,
      });

      const contribDto = this.mapContributionToDTO(createdContrib, sourceAccount.account_name);
      return ok({
        goal: this.mapRowToDTO(updatedGoal, [contribDto]),
        contribution: contribDto,
        updatedAccountBalance: newAccountBalance,
      });
    } catch (e: any) {
      return err(
        'GOAL_CONTRIBUTION_FAILED',
        e.message || 'Failed to record savings goal contribution'
      );
    }
  }

  private mapRowToDTO(
    row: SavingsGoalRow,
    contributions: SavingsContributionDTO[]
  ): SavingsGoalDTO {
    const metrics = SavingsService.computeGoalMetrics({
      targetAmount: row.target_amount,
      currentAmount: row.current_amount,
      targetDate: row.target_date,
      status: row.status,
    });

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      category: row.category,
      targetAmount: row.target_amount,
      initialAmount: row.initial_amount,
      currentAmount: row.current_amount,
      remainingAmount: metrics.remainingAmount,
      progressPercentage: metrics.progressPercentage,
      currency: row.currency,
      targetDate: row.target_date,
      daysRemaining: metrics.daysRemaining,
      estimatedMonthlyRequired: metrics.estimatedMonthlyRequired,
      description: row.description,
      icon: row.icon,
      color: row.color,
      status: row.status,
      completedAt: row.completed_at,
      contributions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapContributionToDTO(
    row: SavingsGoalContributionRow,
    sourceAccountName?: string
  ): SavingsContributionDTO {
    return {
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      sourceAccountId: row.source_account_id,
      sourceAccountName,
      transactionId: row.transaction_id,
      amount: row.amount,
      currency: row.currency,
      contributionDate: row.contribution_date,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}

