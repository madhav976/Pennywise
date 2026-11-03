import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const ContributionInputSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID'),
  sourceAccountId: z.string().uuid('Invalid account ID'),
  amount: z.number().positive('Contribution amount must be greater than zero'),
  contributionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(200).optional(),
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
    const parsed = ContributionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid contribution data' },
        { status: 400 }
      );
    }

    const { goalId, sourceAccountId, amount, contributionDate, notes } = parsed.data;
    const roundedAmount = roundMoney(amount);

    // Verify goal exists and belongs to user
    const { data: goal, error: goalErr } = await supabase
      .from('savings_goals')
      .select('id, name, target_amount, saved_amount')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (goalErr) throw goalErr;
    if (!goal) {
      return NextResponse.json(
        { success: false, error: 'Savings goal not found' },
        { status: 404 }
      );
    }

    // Verify source account exists, belongs to user, and has sufficient funds
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, name, current_balance')
      .eq('id', sourceAccountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (accErr) throw accErr;
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Source account not found' },
        { status: 404 }
      );
    }

    if (Number(account.current_balance) < roundedAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance in ${account.name} (Available: ₹${Number(
            account.current_balance
          ).toLocaleString()}).`,
        },
        { status: 400 }
      );
    }

    const dateStr = contributionDate || new Date().toISOString().split('T')[0];

    // Insert contribution
    const { data: inserted, error: insertErr } = await supabase
      .from('goal_contributions')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        source_account_id: sourceAccountId,
        amount: roundedAmount,
        contribution_date: dateStr,
        notes: notes ? notes.trim() : null,
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    // Fetch refreshed account and goal from Supabase (updated by triggers)
    const [freshAccRes, freshGoalRes] = await Promise.all([
      supabase.from('accounts').select('id, current_balance').eq('id', sourceAccountId).single(),
      supabase.from('savings_goals').select('*').eq('id', goalId).single(),
    ]);

    const createdContrib = {
      id: inserted.id,
      userId: inserted.user_id,
      goalId: inserted.goal_id,
      sourceAccountId: inserted.source_account_id,
      amount: Number(inserted.amount),
      contributionDate: inserted.contribution_date,
      notes: inserted.notes || undefined,
      createdAt: inserted.created_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: createdContrib,
        updatedAccount: freshAccRes.data
          ? { id: freshAccRes.data.id, currentBalance: Number(freshAccRes.data.current_balance) }
          : undefined,
        updatedGoal: freshGoalRes.data
          ? {
              id: freshGoalRes.data.id,
              userId: freshGoalRes.data.user_id,
              name: freshGoalRes.data.name,
              targetAmount: Number(freshGoalRes.data.target_amount),
              savedAmount: Number(freshGoalRes.data.saved_amount),
              targetDate: freshGoalRes.data.target_date || undefined,
              icon: freshGoalRes.data.icon,
              imageUrl: freshGoalRes.data.image_url || undefined,
              createdAt: freshGoalRes.data.created_at,
              updatedAt: freshGoalRes.data.updated_at,
            }
          : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Goal contribution error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record contribution' },
      { status: 500 }
    );
  }
}
