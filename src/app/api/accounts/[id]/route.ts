import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const UpdateAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(60),
  accountType: z.enum(['salary', 'savings', 'cash', 'personal', 'credit', 'custom']),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  monthlyIncome: z.number().min(0, 'Monthly income cannot be negative').optional(),
  icon: z.string().min(1).default('Landmark'),
  description: z.string().max(160).optional(),
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
    const parsed = UpdateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid account details' },
        { status: 400 }
      );
    }

    const { name, accountType, openingBalance, monthlyIncome, icon, description } = parsed.data;

    // Verify account ownership
    const { data: existing, error: findErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    // Check duplicate name on another account
    const { data: duplicate } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `Another account named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const opening = roundMoney(openingBalance);
    let desc = description ? description.trim() : '';
    if (monthlyIncome !== undefined && monthlyIncome > 0) {
      const incomeStr = `Monthly Income: ₹${roundMoney(monthlyIncome)}`;
      desc = desc ? `${desc} • ${incomeStr}` : incomeStr;
    }

    // Update account
    const { data: updated, error: updateErr } = await supabase
      .from('accounts')
      .update({
        name,
        account_type: accountType,
        opening_balance: opening,
        icon,
        description: desc || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Trigger recalculation of balance to ensure opening_balance changes reflect in current_balance
    const { data: recalculatedBalance } = await supabase.rpc(
      'recalculate_account_balance',
      { p_account_id: id }
    );

    const balance = recalculatedBalance !== null ? Number(recalculatedBalance) : Number(updated.current_balance);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        userId: updated.user_id,
        name: updated.name,
        accountType: updated.account_type,
        openingBalance: Number(updated.opening_balance),
        currentBalance: balance,
        monthlyIncome: monthlyIncome !== undefined && monthlyIncome > 0 ? roundMoney(monthlyIncome) : undefined,
        icon: updated.icon,
        description: updated.description || undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update account' },
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

    // Check transactions referencing this account
    const { count: txCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('user_id', user.id);

    if (txCount && txCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete account: it has ${txCount} associated transaction(s). Please delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Check goal contributions referencing this account
    const { count: contribCount } = await supabase
      .from('goal_contributions')
      .select('id', { count: 'exact', head: true })
      .eq('source_account_id', id)
      .eq('user_id', user.id);

    if (contribCount && contribCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete account: it is linked to ${contribCount} savings goal contribution(s).`,
        },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
