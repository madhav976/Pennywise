'use server';

import { err, Result } from '@/lib/result';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountRepository } from '@/modules/finance/repositories/account-repository';
import { SummaryRepository } from '@/modules/finance/repositories/summary-repository';
import { SummaryService } from '@/modules/finance/services/summary-service';
import {
  summaryQuerySchema,
  SummaryQueryInput,
} from '@/modules/finance/validation/summary-schemas';
import { FinancialSummaryDTO } from '@/types/finance';

type ContextResult =
  | { success: true; userId: string; summaryService: SummaryService }
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
  const summaryRepo = new SummaryRepository(supabase);
  const summaryService = new SummaryService(summaryRepo, accountRepo);

  return { success: true, userId: user.id, summaryService };
}

export async function getFinancialSummaryAction(
  query: SummaryQueryInput
): Promise<Result<FinancialSummaryDTO>> {
  const parsed = summaryQuerySchema.safeParse(query);
  if (!parsed.success) {
    return err('VALIDATION_ERROR', 'Invalid summary query parameters', parsed.error.format());
  }

  const context = await getServices();
  if (!context.success) return context.error;

  return context.summaryService.getFinancialSummary(context.userId, parsed.data);
}
