import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const UpdateGoalSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  icon: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const body = await req.json();
    const parsed = UpdateGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid goal data' },
        { status: 400 }
      );
    }

    const { data: existing, error: findErr } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Savings goal not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.targetAmount !== undefined) updates.target_amount = roundMoney(parsed.data.targetAmount);
    if (parsed.data.targetDate !== undefined) updates.target_date = parsed.data.targetDate || null;
    if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;
    if (parsed.data.imageUrl !== undefined) updates.image_url = parsed.data.imageUrl || null;

    const { data: updated, error: updateErr } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        targetAmount: Number(updated.target_amount),
        savedAmount: Number(updated.saved_amount),
        targetDate: updated.target_date || undefined,
        icon: updated.icon,
        imageUrl: updated.image_url || undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Update goal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;

    // Get source accounts for contributions before deleting so we can return refreshed accounts
    const { data: contribs } = await supabase
      .from('goal_contributions')
      .select('source_account_id')
      .eq('goal_id', id)
      .eq('user_id', user.id);

    const affectedAccountIds = Array.from(new Set((contribs || []).map((c) => c.source_account_id)));

    const { error: delErr } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) throw delErr;

    // Fetch refreshed balances for affected accounts
    let updatedAccounts: any[] = [];
    if (affectedAccountIds.length > 0) {
      const { data: accs } = await supabase
        .from('accounts')
        .select('id, current_balance')
        .in('id', affectedAccountIds);
      updatedAccounts = (accs || []).map((a) => ({
        id: a.id,
        currentBalance: Number(a.current_balance),
      }));
    }

    return NextResponse.json({
      success: true,
      updatedAccounts,
    });
  } catch (error: any) {
    console.error('Delete goal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
