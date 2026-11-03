import { NextResponse } from 'next/server';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { ReceiptItemInput } from '@/types/pennywise';

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

    // Fetch all user modules in parallel filtered by user.id
    const [
      accountsRes,
      transactionsRes,
      receiptsRes,
      receiptItemsRes,
      goalsRes,
      contributionsRes,
      recurringRes,
      profileRes,
    ] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('receipt_items')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('goal_contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('contribution_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('recurring_contributions')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    // Check for query errors
    if (accountsRes.error) throw accountsRes.error;
    if (transactionsRes.error) throw transactionsRes.error;
    if (receiptsRes.error) throw receiptsRes.error;
    if (goalsRes.error) throw goalsRes.error;
    if (contributionsRes.error) throw contributionsRes.error;

    // Group receipt items by receipt_id
    const itemsByReceipt = new Map<string, ReceiptItemInput[]>();
    for (const row of receiptItemsRes.data || []) {
      const items = itemsByReceipt.get(row.receipt_id) || [];
      items.push({
        name: row.item_name,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        totalPrice: Number(row.total_price),
      });
      itemsByReceipt.set(row.receipt_id, items);
    }

    const accounts = (accountsRes.data || []).map((row) => {
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

    const receipts = (receiptsRes.data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      merchantName: row.merchant_name,
      receiptDate: row.receipt_date,
      totalAmount: Number(row.total_amount),
      taxAmount: Number(row.tax_amount || 0),
      suggestedCategory: row.suggested_category,
      imagePath: row.image_path || undefined,
      receiptHash: row.receipt_hash,
      rawOcrText: row.raw_ocr_text || undefined,
      status: row.status as 'pending' | 'confirmed',
      items: itemsByReceipt.get(row.id) || [],
      createdAt: row.created_at,
    }));

    const transactions = (transactionsRes.data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      receiptId: row.receipt_id || undefined,
      title: row.title,
      amount: Number(row.amount),
      transactionType: row.transaction_type,
      category: row.category,
      transactionDate: row.transaction_date,
      taxAmount: row.tax_amount !== null ? Number(row.tax_amount) : undefined,
      notes: row.notes || undefined,
      receiptItems: row.receipt_id ? itemsByReceipt.get(row.receipt_id) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const goals = (goalsRes.data || []).map((row) => ({
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

    const contributions = (contributionsRes.data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      goalId: row.goal_id,
      sourceAccountId: row.source_account_id,
      recurringRuleId: row.recurring_rule_id || undefined,
      amount: Number(row.amount),
      contributionDate: row.contribution_date,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));

    const recurringRules = (recurringRes.data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      goalId: row.goal_id,
      sourceAccountId: row.source_account_id,
      amount: Number(row.amount),
      frequency: row.frequency,
      startDate: row.start_date,
      nextRunDate: row.next_run_date,
      lastProcessedDate: row.last_processed_date || undefined,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const profileData = profileRes.data;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: profileData?.email || user.email,
          fullName: profileData?.full_name || user.fullName,
          currency: profileData?.currency || user.currency,
          createdAt: profileData?.created_at || new Date().toISOString(),
        },
        ledger: {
          accounts,
          transactions,
          receipts,
          goals,
          contributions,
          recurringRules,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch ledger:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user ledger' },
      { status: 500 }
    );
  }
}
