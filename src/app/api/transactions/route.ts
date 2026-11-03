import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';
import { roundMoney } from '@/lib/money';

const TransactionInputSchema = z.object({
  accountId: z.string().min(1, 'Account selection is required'),
  title: z.string().trim().min(1, 'Title is required').max(100),
  amount: z.number().positive('Amount must be greater than zero'),
  transactionType: z.enum(['expense', 'income']),
  category: z.string().min(1, 'Category is required'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  taxAmount: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
  receipt: z
    .object({
      merchantName: z.string().min(1),
      receiptDate: z.string(),
      totalAmount: z.number().positive(),
      taxAmount: z.number().optional(),
      suggestedCategory: z.string(),
      receiptHash: z.string().min(1),
      rawOcrText: z.string().optional(),
      items: z.array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().positive(),
          unitPrice: z.number().min(0),
          totalPrice: z.number().min(0),
        })
      ),
    })
    .optional(),
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
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Failed to get transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve transactions' },
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
    const parsed = TransactionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid transaction data' },
        { status: 400 }
      );
    }

    const {
      accountId,
      title,
      amount,
      transactionType,
      category,
      transactionDate,
      taxAmount,
      notes,
      receipt,
    } = parsed.data;

    // Verify account exists and belongs to user
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, current_balance, opening_balance')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (accErr) throw accErr;
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Selected account not found or access denied' },
        { status: 404 }
      );
    }

    let receiptId: string | null = null;

    // If receipt metadata is attached, persist receipt and receipt items
    if (receipt) {
      const receiptHash = receipt.receiptHash;
      // Check if receipt already exists by hash
      const { data: existingReceipt } = await supabase
        .from('receipts')
        .select('id')
        .eq('user_id', user.id)
        .eq('receipt_hash', receiptHash)
        .maybeSingle();

      if (existingReceipt) {
        receiptId = existingReceipt.id;
      } else {
        const { data: newReceipt, error: recInsertErr } = await supabase
          .from('receipts')
          .insert({
            user_id: user.id,
            merchant_name: receipt.merchantName,
            receipt_date: receipt.receiptDate,
            total_amount: roundMoney(receipt.totalAmount),
            tax_amount: receipt.taxAmount ? roundMoney(receipt.taxAmount) : 0,
            suggested_category: receipt.suggestedCategory,
            receipt_hash: receiptHash,
            raw_ocr_text: receipt.rawOcrText || null,
            status: 'confirmed',
          })
          .select('id')
          .single();

        if (recInsertErr) {
          console.warn('Receipt insert warning:', recInsertErr);
        } else if (newReceipt) {
          receiptId = newReceipt.id;
          // Insert receipt items
          if (receipt.items && receipt.items.length > 0) {
            const itemRows = receipt.items.map((it) => ({
              receipt_id: newReceipt.id,
              user_id: user.id,
              item_name: it.name,
              quantity: it.quantity,
              unit_price: roundMoney(it.unitPrice),
              total_price: roundMoney(it.totalPrice),
            }));

            await supabase.from('receipt_items').insert(itemRows);
          }
        }
      }
    }

    // Insert transaction
    const roundedAmount = roundMoney(amount);
    const { data: insertedTx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        receipt_id: receiptId,
        title,
        amount: roundedAmount,
        transaction_type: transactionType,
        category,
        transaction_date: transactionDate,
        tax_amount: taxAmount !== undefined ? roundMoney(taxAmount) : null,
        notes: notes ? notes.trim() : null,
      })
      .select('*')
      .single();

    if (txError) throw txError;

    // Fetch updated account balance (updated by PostgreSQL sync trigger)
    const { data: updatedAcc } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', accountId)
      .single();

    const createdTx = {
      id: insertedTx.id,
      userId: insertedTx.user_id,
      accountId: insertedTx.account_id,
      receiptId: insertedTx.receipt_id || undefined,
      title: insertedTx.title,
      amount: Number(insertedTx.amount),
      transactionType: insertedTx.transaction_type,
      category: insertedTx.category,
      transactionDate: insertedTx.transaction_date,
      taxAmount: insertedTx.tax_amount !== null ? Number(insertedTx.tax_amount) : undefined,
      notes: insertedTx.notes || undefined,
      receiptItems: receipt?.items || undefined,
      createdAt: insertedTx.created_at,
      updatedAt: insertedTx.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: createdTx,
        updatedAccount: {
          id: accountId,
          currentBalance: updatedAcc ? Number(updatedAcc.current_balance) : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record transaction' },
      { status: 500 }
    );
  }
}
