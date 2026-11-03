import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const CreateAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(60),
  accountType: z.enum(['salary', 'savings', 'cash', 'personal', 'credit', 'custom']),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
  monthlyIncome: z.number().min(0, 'Monthly income cannot be negative').optional(),
  icon: z.string().min(1).default('Landmark'),
  description: z.string().max(160).optional(),
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
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const accounts = (data || []).map((row) => {
      let monthlyIncome: number | undefined = undefined;
      if (row.description && row.description.includes('Monthly Income: ₹')) {
        const m = row.description.match(/Monthly Income:\s*₹?\s*([\d,.]+)/);
        if (m) monthlyIncome = parseFloat(m[1].replace(/,/g, ''));
      }
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        accountType: row.account_type,
        openingBalance: Number(row.opening_balance),
        currentBalance: Number(row.current_balance),
        monthlyIncome,
        icon: row.icon,
        description: row.description || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error('Failed to get accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve accounts' },
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
    const parsed = CreateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid account details' },
        { status: 400 }
      );
    }

    const { name, accountType, openingBalance, monthlyIncome, icon, description } = parsed.data;

    // Check duplicate account name for this user
    const { data: existing, error: dupCheckErr } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .maybeSingle();

    if (dupCheckErr) throw dupCheckErr;
    if (existing) {
      return NextResponse.json(
        { success: false, error: `An account named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const opening = roundMoney(openingBalance);
    let desc = description ? description.trim() : '';
    if (monthlyIncome !== undefined && monthlyIncome > 0) {
      const incomeStr = `Monthly Income: ₹${roundMoney(monthlyIncome)}`;
      desc = desc ? `${desc} • ${incomeStr}` : incomeStr;
    }

    // Insert account into public.accounts
    const { data: inserted, error: insertError } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name,
        account_type: accountType,
        opening_balance: opening,
        current_balance: opening,
        icon: icon || 'Landmark',
        description: desc || null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Supabase account insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message || 'Database account insert failed' },
        { status: 500 }
      );
    }

    const createdAccount = {
      id: inserted.id,
      userId: inserted.user_id,
      name: inserted.name,
      accountType: inserted.account_type,
      openingBalance: Number(inserted.opening_balance),
      currentBalance: Number(inserted.current_balance),
      monthlyIncome: monthlyIncome !== undefined && monthlyIncome > 0 ? roundMoney(monthlyIncome) : undefined,
      icon: inserted.icon,
      description: inserted.description || undefined,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    };

    return NextResponse.json({ success: true, data: createdAccount }, { status: 201 });
  } catch (error: any) {
    console.error('Account creation API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error creating account' },
      { status: 500 }
    );
  }
}
