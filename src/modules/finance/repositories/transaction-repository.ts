import { SupabaseClient } from '@supabase/supabase-js';
import { Database, TransactionRow } from '@/types/database';
import { PaginatedTransactionsDTO, TransactionDTO } from '@/types/finance';
import { TransactionFilterInput } from '../validation/transaction-schemas';

export class TransactionRepository {
  constructor(private readonly supabase: SupabaseClient<Database, any, any>) {}

  async findById(transactionId: string, userId: string): Promise<TransactionRow | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }
    return data as TransactionRow;
  }

  async findByIdIncludingDeleted(
    transactionId: string,
    userId: string
  ): Promise<TransactionRow | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }
    return data as TransactionRow;
  }

  async listFiltered(
    userId: string,
    filter: TransactionFilterInput
  ): Promise<PaginatedTransactionsDTO> {
    let query = this.supabase
      .from('transactions')
      .select(
        `
        *,
        financial_accounts!inner(account_name),
        categories(name)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (filter.startDate) {
      query = query.gte('transaction_date', filter.startDate);
    }
    if (filter.endDate) {
      query = query.lte('transaction_date', filter.endDate);
    }
    if (filter.transactionType) {
      query = query.eq('transaction_type', filter.transactionType);
    }
    if (filter.accountId) {
      query = query.eq('account_id', filter.accountId);
    }
    if (filter.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }
    if (filter.paymentMethod) {
      query = query.eq('payment_method', filter.paymentMethod);
    }
    if (filter.minAmount) {
      query = query.gte('amount', filter.minAmount);
    }
    if (filter.maxAmount) {
      query = query.lte('amount', filter.maxAmount);
    }
    if (filter.merchantName) {
      query = query.ilike('merchant_name', `%${filter.merchantName}%`);
    }
    if (filter.search) {
      query = query.or(
        `description.ilike.%${filter.search}%,notes.ilike.%${filter.search}%,merchant_name.ilike.%${filter.search}%`
      );
    }

    const sortColumn = filter.sortBy || 'transaction_date';
    const ascending = filter.sortOrder === 'asc';
    query = query.order(sortColumn, { ascending });

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to list transactions: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Map rows to DTOs
    const transactions: TransactionDTO[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      accountName: row.financial_accounts?.account_name,
      categoryId: row.category_id,
      categoryName: row.categories?.name,
      transactionType: row.transaction_type,
      amount: row.amount,
      currency: row.currency,
      description: row.description,
      merchantName: row.merchant_name,
      paymentMethod: row.payment_method,
      transactionDate: row.transaction_date,
      notes: row.notes,
      referenceNumber: row.reference_number,
      transferPairId: row.transfer_pair_id,
      transferRole: row.transfer_role,
      recurringTransactionId: row.recurring_transaction_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }));

    return {
      transactions,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  async create(tx: Database['public']['Tables']['transactions']['Insert']): Promise<TransactionRow> {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert(tx)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create transaction: ${error?.message}`);
    }
    return data as TransactionRow;
  }

  async update(
    transactionId: string,
    userId: string,
    patch: Partial<TransactionRow>
  ): Promise<TransactionRow> {
    const { data, error } = await this.supabase
      .from('transactions')
      .update(patch)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update transaction: ${error?.message}`);
    }
    return data as TransactionRow;
  }

  async softDelete(transactionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to soft delete transaction: ${error.message}`);
    }
  }

  async linkTransferPair(leg1Id: string, leg2Id: string): Promise<void> {
    const { error: err1 } = await this.supabase
      .from('transactions')
      .update({ transfer_pair_id: leg2Id })
      .eq('id', leg1Id);

    if (err1) throw new Error(`Failed to link transfer leg 1: ${err1.message}`);

    const { error: err2 } = await this.supabase
      .from('transactions')
      .update({ transfer_pair_id: leg1Id })
      .eq('id', leg2Id);

    if (err2) throw new Error(`Failed to link transfer leg 2: ${err2.message}`);
  }
}
