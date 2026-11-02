import { calculateDateRange } from '@/lib/dates';
import { Money } from '@/lib/money';
import { err, ok, Result } from '@/lib/result';
import { FinancialSummaryDTO } from '@/types/finance';
import { AccountRepository } from '../repositories/account-repository';
import { SummaryRepository } from '../repositories/summary-repository';
import { SummaryQueryInput } from '../validation/summary-schemas';
import { AccountService } from './account-service';

export class SummaryService {
  constructor(
    private readonly summaryRepo: SummaryRepository,
    private readonly accountRepo: AccountRepository
  ) {}

  async getFinancialSummary(
    userId: string,
    query: SummaryQueryInput
  ): Promise<Result<FinancialSummaryDTO>> {
    try {
      // 1. Calculate Period Boundary
      const range = calculateDateRange(
        query.period,
        query.customStart,
        query.customEnd,
        query.timezone
      );

      // 2. Fetch Period Income & Expenses
      const totals = await this.summaryRepo.getPeriodTotals(
        userId,
        range.startDateIso,
        range.endDateIso,
        query.accountId
      );

      const incomeMoney = Money.from(totals.totalIncome);
      const expenseMoney = Money.from(totals.totalExpenses);
      const netCashFlow = incomeMoney.subtract(expenseMoney);

      // 3. Fetch Category Breakdown
      const rawCategories = await this.summaryRepo.getCategoryExpenditure(
        userId,
        range.startDateIso,
        range.endDateIso,
        query.accountId
      );

      const categoryExpenditure = rawCategories.map((c) => {
        const catAmt = Money.from(c.totalAmount);
        const percentage = expenseMoney.isPositive()
          ? catAmt.divide(expenseMoney).multiply(100).toNumber()
          : 0;

        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          totalAmount: catAmt.toDbString(),
          percentage: Number(percentage.toFixed(2)),
        };
      });

      // 4. Fetch Payment Method Breakdown
      const rawPaymentMethods = await this.summaryRepo.getPaymentMethodExpenditure(
        userId,
        range.startDateIso,
        range.endDateIso,
        query.accountId
      );

      const paymentMethodExpenditure = rawPaymentMethods.map((p) => {
        const pAmt = Money.from(p.totalAmount);
        const percentage = expenseMoney.isPositive()
          ? pAmt.divide(expenseMoney).multiply(100).toNumber()
          : 0;

        return {
          paymentMethod: p.paymentMethod,
          totalAmount: pAmt.toDbString(),
          percentage: Number(percentage.toFixed(2)),
        };
      });

      // 5. Fetch Daily Breakdown
      const dailyExpenditure = await this.summaryRepo.getDailyExpenditure(
        userId,
        range.startDateIso,
        range.endDateIso,
        query.accountId
      );

      const dailyCashFlow = await this.summaryRepo.getDailyCashFlow(
        userId,
        range.startDateIso,
        range.endDateIso,
        query.accountId
      );

      // 6. Compute Total Assets, Liabilities & Net Worth from Active Accounts
      const accounts = await this.accountRepo.listByUser(userId);
      let totalAssets = Money.zero();
      let totalLiabilities = Money.zero();

      for (const acc of accounts) {
        if (!acc.is_active) continue;

        const bal = Money.from(acc.current_balance);
        if (AccountService.isLiability(acc.account_type)) {
          totalLiabilities = totalLiabilities.add(bal);
        } else {
          totalAssets = totalAssets.add(bal);
        }
      }

      const netWorth = totalAssets.subtract(totalLiabilities);

      return ok({
        period: query.period,
        startDate: range.startDateIso,
        endDate: range.endDateIso,
        totalIncome: incomeMoney.toDbString(),
        totalExpenses: expenseMoney.toDbString(),
        netCashFlow: netCashFlow.toDbString(),
        totalAssets: totalAssets.toDbString(),
        totalLiabilities: totalLiabilities.toDbString(),
        netWorth: netWorth.toDbString(),
        categoryExpenditure,
        paymentMethodExpenditure,
        dailyExpenditure,
        dailyCashFlow,
      });
    } catch (e: any) {
      return err('SUMMARY_CALCULATION_FAILED', e.message || 'Failed to calculate financial summary');
    }
  }
}

