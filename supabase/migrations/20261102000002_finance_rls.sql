-- ====================================================================
-- PULSE Finance Tracker Module - Row Level Security (RLS) Policies
-- Migration: 20261102000002_finance_rls.sql
-- ====================================================================

-- 1. Enable Row Level Security across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. Profiles Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- 3. Financial Accounts Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "accounts_select_own" ON public.financial_accounts;
CREATE POLICY "accounts_select_own" 
ON public.financial_accounts FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_insert_own" ON public.financial_accounts;
CREATE POLICY "accounts_insert_own" 
ON public.financial_accounts FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_update_own" ON public.financial_accounts;
CREATE POLICY "accounts_update_own" 
ON public.financial_accounts FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_delete_own" ON public.financial_accounts;
CREATE POLICY "accounts_delete_own" 
ON public.financial_accounts FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 4. Categories Policies (Private Custom & System Default)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_select_accessible" ON public.categories;
CREATE POLICY "categories_select_accessible" 
ON public.categories FOR SELECT 
TO authenticated 
USING (is_system = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" 
ON public.categories FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" 
ON public.categories FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id AND is_system = FALSE)
WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" 
ON public.categories FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id AND is_system = FALSE);

-- --------------------------------------------------------------------
-- 5. Transactions Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" 
ON public.transactions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" 
ON public.transactions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" 
ON public.transactions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" 
ON public.transactions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 6. Recurring Transactions Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "recurring_select_own" ON public.recurring_transactions;
CREATE POLICY "recurring_select_own" 
ON public.recurring_transactions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_insert_own" ON public.recurring_transactions;
CREATE POLICY "recurring_insert_own" 
ON public.recurring_transactions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_update_own" ON public.recurring_transactions;
CREATE POLICY "recurring_update_own" 
ON public.recurring_transactions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_delete_own" ON public.recurring_transactions;
CREATE POLICY "recurring_delete_own" 
ON public.recurring_transactions FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 7. Recurring Logs & Audit Logs Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "recurring_logs_select_own" ON public.recurring_transaction_logs;
CREATE POLICY "recurring_logs_select_own" 
ON public.recurring_transaction_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.recurring_transactions rt 
        WHERE rt.id = recurring_transaction_logs.recurring_transaction_id 
          AND rt.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.transaction_audit_logs;
CREATE POLICY "audit_logs_select_own" 
ON public.transaction_audit_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

