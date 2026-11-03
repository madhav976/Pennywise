import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const CreateGoalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(80),
  targetAmount: z.number().positive('Target amount must be greater than zero'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  icon: z.string().min(1).default('smartphone'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  initialContribution: z.number().min(0).optional(),
  initialSourceAccountId: z.string().uuid().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const goals = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      targetAmount: Number(row.target_amount),
      savedAmount: Number(row.saved_amount),
      targetDate: row.target_date || undefined,
      icon: row.icon,
      imageUrl: row.image_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ success: true, data: goals });
  } catch (error: any) {
    console.error('Failed to get goals:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve goals' },
      { status: 500 }
    );
  }
}

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
    const parsed = CreateGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid goal data' },
        { status: 400 }
      );
    }

    const {
      name,
      targetAmount,
      targetDate,
      icon,
      imageUrl,
      initialContribution,
      initialSourceAccountId,
    } = parsed.data;

    // Insert savings goal
    const { data: insertedGoal, error: goalErr } = await supabase
      .from('savings_goals')
      .insert({
        user_id: user.id,
        name,
        target_amount: roundMoney(targetAmount),
        saved_amount: 0,
        target_date: targetDate || null,
        icon: icon || 'smartphone',
        image_url: imageUrl || null,
      })
      .select('*')
      .single();

    if (goalErr) throw goalErr;

    let initialContribRecord: any = null;
    let updatedAccountRecord: any = null;

    // Process initial contribution if configured
    if (
      initialContribution !== undefined &&
      initialContribution > 0 &&
      initialSourceAccountId
    ) {
      // Verify source account exists and belongs to user
      const { data: sourceAcc, error: accCheckErr } = await supabase
        .from('accounts')
        .select('id, current_balance')
        .eq('id', initialSourceAccountId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (accCheckErr) throw accCheckErr;
      if (!sourceAcc) {
        return NextResponse.json(
          { success: false, error: 'Source account not found' },
          { status: 404 }
        );
      }

      if (Number(sourceAcc.current_balance) < initialContribution) {
        // Rollback goal creation if insufficient funds
        await supabase.from('savings_goals').delete().eq('id', insertedGoal.id);
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient balance in account to make initial allocation of ₹${roundMoney(
              initialContribution
            )}.`,
          },
          { status: 400 }
        );
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const { data: contribData, error: contribErr } = await supabase
        .from('goal_contributions')
        .insert({
          user_id: user.id,
          goal_id: insertedGoal.id,
          source_account_id: initialSourceAccountId,
          amount: roundMoney(initialContribution),
          contribution_date: todayStr,
          notes: 'Initial goal allocation',
        })
        .select('*')
        .single();

      if (contribErr) throw contribErr;
      initialContribRecord = contribData;

      // Fetch recalculated account balance
      const { data: freshAcc } = await supabase
        .from('accounts')
        .select('id, current_balance')
        .eq('id', initialSourceAccountId)
        .single();

      updatedAccountRecord = freshAcc;
    }

    // Fetch refreshed goal after any contribution triggers
    const { data: freshGoal } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', insertedGoal.id)
      .single();

    const goal = {
      id: freshGoal.id,
      userId: freshGoal.user_id,
      name: freshGoal.name,
      targetAmount: Number(freshGoal.target_amount),
      savedAmount: Number(freshGoal.saved_amount),
      targetDate: freshGoal.target_date || undefined,
      icon: freshGoal.icon,
      imageUrl: freshGoal.image_url || undefined,
      createdAt: freshGoal.created_at,
      updatedAt: freshGoal.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: goal,
        contribution: initialContribRecord
          ? {
              id: initialContribRecord.id,
              userId: initialContribRecord.user_id,
              goalId: initialContribRecord.goal_id,
              sourceAccountId: initialContribRecord.source_account_id,
              amount: Number(initialContribRecord.amount),
              contributionDate: initialContribRecord.contribution_date,
              notes: initialContribRecord.notes || undefined,
              createdAt: initialContribRecord.created_at,
            }
          : undefined,
        updatedAccount: updatedAccountRecord
          ? {
              id: updatedAccountRecord.id,
              currentBalance: Number(updatedAccountRecord.current_balance),
            }
          : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create goal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create savings goal' },
      { status: 500 }
    );
  }
}
