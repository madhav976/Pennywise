import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const UpdateTxSchema = z.object({
  accountId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  taxAmount: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
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
    const parsed = UpdateTxSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data' },
        { status: 400 }
      );
    }

    const { data: existing, error: findErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or access denied' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.amount !== undefined) updates.amount = roundMoney(parsed.data.amount);
    if (parsed.data.category !== undefined) updates.category = parsed.data.category;
    if (parsed.data.transactionDate !== undefined) updates.transaction_date = parsed.data.transactionDate;
    if (parsed.data.taxAmount !== undefined) updates.tax_amount = roundMoney(parsed.data.taxAmount);
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ? parsed.data.notes.trim() : null;
    if (parsed.data.accountId !== undefined) {
      // Verify account belongs to user
      const { data: targetAcc } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', parsed.data.accountId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!targetAcc) {
        return NextResponse.json(
          { success: false, error: 'Target account not found' },
          { status: 404 }
        );
      }
      updates.account_id = parsed.data.accountId;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Fetch updated account balance
    const { data: acc } = await supabase
      .from('accounts')
      .select('id, current_balance')
      .eq('id', updated.account_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        userId: updated.user_id,
        accountId: updated.account_id,
        receiptId: updated.receipt_id || undefined,
        title: updated.title,
        amount: Number(updated.amount),
        transactionType: updated.transaction_type,
        category: updated.category,
        transactionDate: updated.transaction_date,
        taxAmount: updated.tax_amount !== null ? Number(updated.tax_amount) : undefined,
        notes: updated.notes || undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
      updatedAccount: acc ? { id: acc.id, currentBalance: Number(acc.current_balance) } : undefined,
    });
  } catch (error: any) {
    console.error('Update transaction error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update transaction' },
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

    const { data: existing, error: findErr } = await supabase
      .from('transactions')
      .select('id, account_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or access denied' },
        { status: 404 }
      );
    }

    const accountId = existing.account_id;

    const { error: delErr } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) throw delErr;

    // Fetch updated balance after trigger recalculated it
    const { data: acc } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', accountId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      updatedAccount: acc ? { id: accountId, currentBalance: Number(acc.current_balance) } : undefined,
    });
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
