import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { SummaryRepository } from '@/modules/finance/repositories/summary-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { AccountService } from '@/modules/finance/services/account-service';
import { SummaryService } from '@/modules/finance/services/summary-service';
import { TransactionService } from '@/modules/finance/services/transaction-service';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { CategoryService } from '@/modules/finance/services/category-service';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { AccountDTO, FinancialSummaryDTO, TransactionDTO } from '@/types/finance';

export const dynamic = 'force-dynamic';

export default async function OverviewDashboardPage() {
  let summary: FinancialSummaryDTO | null = null;
  let accounts: AccountDTO[] = [];
  let transactions: TransactionDTO[] = [];
  let userName = 'Jason Jones';
  let userEmail = 'jason.jones@pulse.app';
  let userAvatarUrl: string | undefined;
  let userCurrency = 'USD';

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || userEmail;
      userName = user.user_metadata?.full_name || userName;
      userAvatarUrl = user.user_metadata?.avatar_url;
      userCurrency = user.user_metadata?.preferred_currency || userCurrency;

      const accountRepo = new AccountRepository(supabase);
      const categoryRepo = new CategoryRepository(supabase);
      const transactionRepo = new TransactionRepository(supabase);
      const summaryRepo = new SummaryRepository(supabase);

      const categoryService = new CategoryService(categoryRepo);
      const transactionService = new TransactionService(
        transactionRepo,
        accountRepo,
        categoryService
      );
      const summaryService = new SummaryService(summaryRepo, accountRepo);
      const accountService = new AccountService(accountRepo);

      // Fetch Accounts
      const accountsRes = await accountService.listAccounts(user.id);
      if (accountsRes.success) {
        accounts = accountsRes.data;
      }

      // Fetch Summary
      const summaryRes = await summaryService.getFinancialSummary(user.id, {
        period: 'this_month',
        timezone: user.user_metadata?.timezone || 'UTC',
      });
      if (summaryRes.success) {
        summary = summaryRes.data;
      }

      // Fetch Recent Transactions
      const txRes = await transactionService.listTransactions(user.id, {
        page: 1,
        pageSize: 6,
        sortBy: 'transaction_date',
        sortOrder: 'desc',
      });
      if (txRes.success) {
        transactions = txRes.data.transactions;
      }
    }
  } catch (err) {
    // If Supabase is not yet logged in / env variables not configured yet,
    // fallback gracefully to sample preview state
    console.warn('Dashboard running in preview mode or unauthenticated context');
  }

  return (
    <DashboardClient
      initialSummary={summary}
      initialAccounts={accounts}
      initialTransactions={transactions}
      userName={userName}
      userEmail={userEmail}
      userAvatarUrl={userAvatarUrl}
      userCurrency={userCurrency}
    />
  );
}

