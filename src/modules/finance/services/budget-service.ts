import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { BudgetRow } from '@/types/database';
import { BudgetAlertLevel, BudgetDTO, CategoryDTO, TransactionDTO } from '@/types/finance';
import { BudgetRepository } from '../repositories/budget-repository';
import { CategoryRepository } from '../repositories/category-repository';
import { TransactionRepository } from '../repositories/transaction-repository';
import { CreateBudgetInput, UpdateBudgetInput } from '../validation/budget-schemas';

export class BudgetService {
  constructor(
    private readonly budgetRepo: BudgetRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly categoryRepo: CategoryRepository
  ) {}

  /**
   * Evaluates spending status threshold per specification:
   * - Below 50%: normal
   * - 50–79.99%: monitor
   * - 80–99.99%: warning (approaching limit)
   * - 100% or above: exceeded
   */
  static resolveAlertLevel(utilizationPercentage: number): BudgetAlertLevel {
    if (utilizationPercentage >= 100) return 'exceeded';
    if (utilizationPercentage >= 80) return 'warning';
    if (utilizationPercentage >= 50) return 'monitor';
    return 'normal';
  }

  /**
   * Resolves which threshold milestones (50, 80, 100) have been crossed without duplicating alerts.
   */
  static resolveTriggeredThresholds(
    utilizationPercentage: number,
    existingThresholds: number[] = []
  ): { updatedThresholds: number[]; newlyTriggered: number[] } {
    const milestones = [50, 80, 100];
    const existingSet = new Set(existingThresholds);
    const newlyTriggered: number[] = [];

    for (const m of milestones) {
      if (utilizationPercentage >= m && !existingSet.has(m)) {
        existingSet.add(m);
        newlyTriggered.push(m);
      }
    }

    return {
      updatedThresholds: Array.from(existingSet).sort((a, b) => a - b),
      newlyTriggered,
    };
  }

  /**
   * Automatically computes budget spending, remaining budget, utilization percentage,
   * and alert level from eligible expense transactions in the ledger.
   *
   * Rules enforced:
   * - Only `transactionType === 'expense'` and `deletedAt == null` are eligible.
   * - Transfers and income transactions NEVER increase expense budget utilization.
   * - Must match `currency`, fall within `[startDate, endDate]`, and match `categoryId` (unless null = overall budget).
   */
  static computeBudgetUtilization(
    budget: {
      id: string;
      userId: string;
      name: string;
      categoryId: string | null;
      categoryName: string;
      amount: string;
      currency: string;
      period: BudgetDTO['period'];
      startDate: string;
      endDate: string;
      description: string | null;
      isActive: boolean;
      alertThresholdsTriggered: number[];
      createdAt: string;
      updatedAt: string;
    },
    transactions: Pick<
      TransactionDTO,
      | 'transactionType'
      | 'categoryId'
      | 'amount'
      | 'currency'
      | 'transactionDate'
      | 'deletedAt'
    >[]
  ): BudgetDTO {
    const startKey = budget.startDate.slice(0, 10);
    const endKey = budget.endDate.slice(0, 10);

    let spent = Money.zero();

    for (const tx of transactions) {
      if (tx.deletedAt) continue;
      if (tx.transactionType !== 'expense') continue;
      if (tx.currency && tx.currency !== budget.currency) continue;

      const txDateKey = tx.transactionDate.slice(0, 10);
      if (txDateKey < startKey || txDateKey > endKey) continue;

      if (budget.categoryId && tx.categoryId !== budget.categoryId) continue;

      spent = spent.add(Money.from(tx.amount));
    }

    const allocated = Money.from(budget.amount);
    const remaining = allocated.subtract(spent);
    const utilizationPercentage = allocated.isPositive()
      ? Number(spent.divide(allocated).multiply(100).toNumber().toFixed(2))
      : 0;

    const alertLevel = BudgetService.resolveAlertLevel(utilizationPercentage);
    const { updatedThresholds } = BudgetService.resolveTriggeredThresholds(
      utilizationPercentage,
      budget.alertThresholdsTriggered
    );

    return {
      ...budget,
      amount: allocated.toDbString(),
      spentAmount: spent.toDbString(),
      remainingAmount: remaining.toDbString(),
      utilizationPercentage,
      alertLevel,
      alertThresholdsTriggered: updatedThresholds,
    };
  }

  async listBudgets(userId: string): Promise<Result<BudgetDTO[]>> {
    try {
      const [rows, categories, txResult] = await Promise.all([
        this.budgetRepo.listByUser(userId),
        this.categoryRepo.listAccessible(userId),
        this.transactionRepo.listFiltered(userId, {
          page: 1,
          pageSize: 100,
          sortBy: 'transaction_date',
          sortOrder: 'desc',
        }),
      ]);

      const categoryMap = new Map<string, string>(
        categories.map((c) => [c.id, c.name])
      );

      const dtos = rows.map((row) =>
        this.mapRowWithTransactions(row, categoryMap, txResult.transactions)
      );

      return ok(dtos);
    } catch (e: any) {
      return err('BUDGETS_LIST_FAILED', e.message || 'Failed to list budgets');
    }
  }

  async createBudget(userId: string, input: CreateBudgetInput): Promise<Result<BudgetDTO>> {
    try {
      const formattedAmount = Money.from(input.amount).toDbString();

      const created = await this.budgetRepo.create({
        user_id: userId,
        name: input.name,
        category_id: input.categoryId || null,
        amount: formattedAmount,
        currency: input.currency,
        period: input.period,
        start_date: input.startDate,
        end_date: input.endDate,
        description: input.description || null,
        is_active: true,
        alert_thresholds_triggered: [],
      });

      const [categories, txResult] = await Promise.all([
        this.categoryRepo.listAccessible(userId),
        this.transactionRepo.listFiltered(userId, {
          page: 1,
          pageSize: 100,
          sortBy: 'transaction_date',
          sortOrder: 'desc',
        }),
      ]);
      const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

      return ok(this.mapRowWithTransactions(created, categoryMap, txResult.transactions));
    } catch (e: any) {
      return err('BUDGET_CREATION_FAILED', e.message || 'Failed to create budget');
    }
  }

  async updateBudget(userId: string, input: UpdateBudgetInput): Promise<Result<BudgetDTO>> {
    try {
      const existing = await this.budgetRepo.findById(input.budgetId, userId);
      if (!existing) {
        return err('BUDGET_NOT_FOUND', 'Budget not found or access denied');
      }

      const patch: Partial<BudgetRow> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.categoryId !== undefined) patch.category_id = input.categoryId;
      if (input.amount !== undefined) patch.amount = Money.from(input.amount).toDbString();
      if (input.period !== undefined) patch.period = input.period;
      if (input.startDate !== undefined) patch.start_date = input.startDate;
      if (input.endDate !== undefined) patch.end_date = input.endDate;
      if (input.description !== undefined) patch.description = input.description;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const updated = await this.budgetRepo.update(input.budgetId, userId, patch);

      const [categories, txResult] = await Promise.all([
        this.categoryRepo.listAccessible(userId),
        this.transactionRepo.listFiltered(userId, {
          page: 1,
          pageSize: 100,
          sortBy: 'transaction_date',
          sortOrder: 'desc',
        }),
      ]);
      const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

      return ok(this.mapRowWithTransactions(updated, categoryMap, txResult.transactions));
    } catch (e: any) {
      return err('BUDGET_UPDATE_FAILED', e.message || 'Failed to update budget');
    }
  }

  async deleteBudget(budgetId: string, userId: string): Promise<Result<{ id: string }>> {
    try {
      const existing = await this.budgetRepo.findById(budgetId, userId);
      if (!existing) {
        return err('BUDGET_NOT_FOUND', 'Budget not found or access denied');
      }
      await this.budgetRepo.delete(budgetId, userId);
      return ok({ id: budgetId });
    } catch (e: any) {
      return err('BUDGET_DELETE_FAILED', e.message || 'Failed to delete budget');
    }
  }

  private mapRowWithTransactions(
    row: BudgetRow,
    categoryMap: Map<string, string>,
    transactions: TransactionDTO[]
  ): BudgetDTO {
    const categoryName = row.category_id
      ? categoryMap.get(row.category_id) || 'Expense Category'
      : 'Overall Spending';

    return BudgetService.computeBudgetUtilization(
      {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        categoryId: row.category_id,
        categoryName,
        amount: row.amount,
        currency: row.currency,
        period: row.period,
        startDate: row.start_date,
        endDate: row.end_date,
        description: row.description,
        isActive: row.is_active,
        alertThresholdsTriggered: Array.isArray(row.alert_thresholds_triggered)
          ? row.alert_thresholds_triggered
          : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      transactions
    );
  }
}
