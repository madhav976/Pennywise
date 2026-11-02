import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { CategoryRepository } from '@/modules/finance/repositories/category-repository';
import { RecurringRepository } from '@/modules/finance/repositories/recurring-repository';
import { TransactionRepository } from '@/modules/finance/repositories/transaction-repository';
import { CategoryService } from '@/modules/finance/services/category-service';
import { RecurringService } from '@/modules/finance/services/recurring-service';
import { TransactionService } from '@/modules/finance/services/transaction-service';
import { TransferService } from '@/modules/finance/services/transfer-service';

export async function POST(req: NextRequest) {
  // 1. Guard with Secret Header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron invocation' },
      { status: 401 }
    );
  }

  try {
    const adminSupabase = createAdminClient();

    const accountRepo = new AccountRepository(adminSupabase);
    const categoryRepo = new CategoryRepository(adminSupabase);
    const transactionRepo = new TransactionRepository(adminSupabase);
    const recurringRepo = new RecurringRepository(adminSupabase);

    const categoryService = new CategoryService(categoryRepo);
    const transactionService = new TransactionService(transactionRepo, accountRepo, categoryService);
    const transferService = new TransferService(transactionRepo, accountRepo);

    const recurringService = new RecurringService(
      recurringRepo,
      accountRepo,
      transactionService,
      transferService
    );

    const result = await recurringService.processDueSchedules();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process recurring transactions',
      },
      { status: 500 }
    );
  }
}

