import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const RecurringRuleSchema = z.object({
  id: z.string().uuid().optional(),
  goalId: z.string().uuid(),
  sourceAccountId: z.string().uuid(),
  amount: z.number().positive(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isEnabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const body = await req.json();
    const parsed = RecurringRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid recurring schedule data' },
        { status: 400 }
      );
    }

    const { goalId, sourceAccountId, amount, frequency, startDate, isEnabled } = parsed.data;

    // Verify goal and account ownership
    const [goalCheck, accCheck] = await Promise.all([
      supabase.from('savings_goals').select('id').eq('id', goalId).eq('user_id', user.id).maybeSingle(),
      supabase.from('accounts').select('id').eq('id', sourceAccountId).eq('user_id', user.id).maybeSingle(),
    ]);

    if (!goalCheck.data || !accCheck.data) {
      return NextResponse.json(
        { success: false, error: 'Goal or source account not found' },
        { status: 404 }
      );
    }

    // Upsert recurring rule
    const { data: upserted, error: upsertErr } = await supabase
      .from('recurring_contributions')
      .upsert(
        {
          user_id: user.id,
          goal_id: goalId,
          source_account_id: sourceAccountId,
          amount: roundMoney(amount),
          frequency,
          start_date: startDate,
          next_run_date: startDate,
          is_enabled: isEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'goal_id' }
      )
      .select('*')
      .single();

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      success: true,
      data: {
        id: upserted.id,
        userId: upserted.user_id,
        goalId: upserted.goal_id,
        sourceAccountId: upserted.source_account_id,
        amount: Number(upserted.amount),
        frequency: upserted.frequency,
        startDate: upserted.start_date,
        nextRunDate: upserted.next_run_date,
        lastProcessedDate: upserted.last_processed_date || undefined,
        isEnabled: upserted.is_enabled,
        createdAt: upserted.created_at,
        updatedAt: upserted.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Recurring rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to configure recurring schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recurring rule ID is required' },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabase
      .from('recurring_contributions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'Recurring schedule removed' });
  } catch (error: any) {
    console.error('Delete recurring rule error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
