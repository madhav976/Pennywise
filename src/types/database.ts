/**
 * Supabase Database Schema TypeScript Types.
 * Represents raw rows from the PostgreSQL database tables.
 */

export type AccountType =
  | 'cash'
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'digital_wallet'
  | 'investment'
  | 'loan';

export type CategoryType = 'income' | 'expense';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'debit_card'
  | 'credit_card'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'other';

export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export type RecurringLogStatus = 'success' | 'failed' | 'skipped';

export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export type SavingsGoalStatus = 'active' | 'paused' | 'completed';

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  preferred_currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialAccountRow {
  id: string;
  user_id: string;
  account_name: string;
  account_type: AccountType;
  institution_name: string | null;
  currency: string;
  opening_balance: string; // Stored as NUMERIC(15, 4) in DB
  current_balance: string; // Stored as NUMERIC(15, 4) in DB
  credit_limit: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  category_type: CategoryType;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: string; // NUMERIC(15, 4)
  currency: string;
  description: string;
  merchant_name: string | null;
  payment_method: PaymentMethod;
  transaction_date: string;
  notes: string | null;
  reference_number: string | null;
  transfer_pair_id: string | null;
  transfer_role: 'source' | 'destination' | null;
  recurring_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecurringTransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: TransactionType;
  target_account_id: string | null;
  amount: string;
  currency: string;
  description: string;
  merchant_name: string | null;
  payment_method: PaymentMethod;
  frequency: RecurringFrequency;
  interval_count: number;
  start_date: string;
  end_date: string | null;
  next_execution_date: string;
  last_executed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionLogRow {
  id: string;
  recurring_transaction_id: string;
  executed_date: string;
  generated_transaction_id: string | null;
  status: RecurringLogStatus;
  error_message: string | null;
  executed_at: string;
}

export interface TransactionAuditLogRow {
  id: string;
  transaction_id: string;
  user_id: string;
  action: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  amount: string;
  currency: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  description: string | null;
  is_active: boolean;
  alert_thresholds_triggered: number[];
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  target_amount: string;
  initial_amount: string;
  current_amount: string;
  currency: string;
  target_date: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: SavingsGoalStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalContributionRow {
  id: string;
  goal_id: string;
  user_id: string;
  source_account_id: string;
  transaction_id: string | null;
  amount: string;
  currency: string;
  contribution_date: string;
  notes: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProfileRow>;
      };
      financial_accounts: {
        Row: FinancialAccountRow;
        Insert: {
          id?: string;
          user_id: string;
          account_name: string;
          account_type: AccountType;
          institution_name?: string | null;
          currency?: string;
          opening_balance?: string;
          current_balance?: string;
          credit_limit?: string | null;
          description?: string | null;
          color?: string | null;
          icon?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FinancialAccountRow>;
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          category_type: CategoryType;
          icon?: string | null;
          color?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CategoryRow>;
      };
      transactions: {
        Row: TransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          transaction_type: TransactionType;
          amount: string;
          currency?: string;
          description: string;
          merchant_name?: string | null;
          payment_method?: PaymentMethod;
          transaction_date: string;
          notes?: string | null;
          reference_number?: string | null;
          transfer_pair_id?: string | null;
          transfer_role?: 'source' | 'destination' | null;
          recurring_transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<TransactionRow>;
      };
      recurring_transactions: {
        Row: RecurringTransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id?: string | null;
          transaction_type: TransactionType;
          target_account_id?: string | null;
          amount: string;
          currency?: string;
          description: string;
          merchant_name?: string | null;
          payment_method?: PaymentMethod;
          frequency: RecurringFrequency;
          interval_count?: number;
          start_date: string;
          end_date?: string | null;
          next_execution_date: string;
          last_executed_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<RecurringTransactionRow>;
      };
      recurring_transaction_logs: {
        Row: RecurringTransactionLogRow;
        Insert: Omit<RecurringTransactionLogRow, 'id' | 'executed_at'> & {
          id?: string;
          executed_at?: string;
        };
        Update: Partial<RecurringTransactionLogRow>;
      };
      transaction_audit_logs: {
        Row: TransactionAuditLogRow;
        Insert: Omit<TransactionAuditLogRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<TransactionAuditLogRow>;
      };
      budgets: {
        Row: BudgetRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category_id?: string | null;
          amount: string;
          currency?: string;
          period?: BudgetPeriod;
          start_date: string;
          end_date: string;
          description?: string | null;
          is_active?: boolean;
          alert_thresholds_triggered?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<BudgetRow>;
      };
      savings_goals: {
        Row: SavingsGoalRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string;
          target_amount: string;
          initial_amount?: string;
          current_amount?: string;
          currency?: string;
          target_date: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          status?: SavingsGoalStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SavingsGoalRow>;
      };
      savings_goal_contributions: {
        Row: SavingsGoalContributionRow;
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          source_account_id: string;
          transaction_id?: string | null;
          amount: string;
          currency?: string;
          contribution_date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<SavingsGoalContributionRow>;
      };
    };
  };
};
