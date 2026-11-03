-- ============================================================================
-- PENNYWISE: AI-Powered Personal Expense Tracker
-- Normalized PostgreSQL Schema, RLS Policies, Triggers & Atomic RPCs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Pennywise User',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  account_type TEXT NOT NULL CHECK (account_type IN ('salary', 'savings', 'cash', 'personal', 'credit', 'custom')),
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  icon TEXT NOT NULL DEFAULT 'wallet',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- 3. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'expense' CHECK (category_type IN ('expense', 'income')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);

-- 4. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount > 0),
  tax_amount NUMERIC(14, 2) DEFAULT 0.00,
  suggested_category TEXT NOT NULL,
  image_path TEXT,
  receipt_hash TEXT NOT NULL,
  raw_ocr_text TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_receipt_hash UNIQUE (user_id, receipt_hash)
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);

-- 5. RECEIPT ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_user_id ON public.receipt_items(user_id);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income')),
  category TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  tax_amount NUMERIC(14, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(user_id, category);

-- 7. SAVINGS GOALS TABLE
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  saved_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (saved_amount >= 0),
  target_date DATE,
  icon TEXT NOT NULL DEFAULT 'smartphone',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);

-- 8. RECURRING CONTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.recurring_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  source_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  next_run_date DATE NOT NULL,
  last_processed_date DATE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recurring_goal UNIQUE (goal_id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_contributions_user_id ON public.recurring_contributions(user_id);

-- 9. GOAL CONTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  source_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  recurring_rule_id UUID REFERENCES public.recurring_contributions(id) ON DELETE SET NULL,
  period_key TEXT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recurring_period_execution UNIQUE (recurring_rule_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_account_id ON public.goal_contributions(source_account_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON public.goal_contributions(user_id);

-- ============================================================================
-- FINANCIAL INTEGRITY FUNCTIONS & TRIGGERS
-- Invariant:
--   Account Current Balance = Opening Balance + Income - Expenses - Goal Contributions
--   Goal Saved Amount = Sum(Goal Contributions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC(14, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening NUMERIC(14, 2);
  v_income NUMERIC(14, 2);
  v_expense NUMERIC(14, 2);
  v_contributions NUMERIC(14, 2);
  v_new_balance NUMERIC(14, 2);
BEGIN
  SELECT opening_balance INTO v_opening
  FROM public.accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN 0.00;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0.00)
  INTO v_income, v_expense
  FROM public.transactions
  WHERE account_id = p_account_id;

  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_contributions
  FROM public.goal_contributions
  WHERE source_account_id = p_account_id;

  v_new_balance := ROUND(v_opening + v_income - v_expense - v_contributions, 2);

  UPDATE public.accounts
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_goal_saved_amount(p_goal_id UUID)
RETURNS NUMERIC(14, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_saved NUMERIC(14, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_saved
  FROM public.goal_contributions
  WHERE goal_id = p_goal_id;

  UPDATE public.savings_goals
  SET saved_amount = ROUND(v_saved, 2),
      updated_at = NOW()
  WHERE id = p_goal_id;

  RETURN v_saved;
END;
$$;

-- Trigger on transactions to keep account balance synchronized
CREATE OR REPLACE FUNCTION public.trg_sync_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_account_balance(NEW.account_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
      PERFORM public.recalculate_account_balance(OLD.account_id);
    END IF;
    PERFORM public.recalculate_account_balance(NEW.account_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_account_balance(OLD.account_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_balance_sync ON public.transactions;
CREATE TRIGGER trg_transactions_balance_sync
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_transaction_balance();

-- Trigger on goal_contributions to keep account balance and goal saved_amount synchronized
CREATE OR REPLACE FUNCTION public.trg_sync_goal_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_account_balance(NEW.source_account_id);
    PERFORM public.recalculate_goal_saved_amount(NEW.goal_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.source_account_id IS DISTINCT FROM NEW.source_account_id THEN
      PERFORM public.recalculate_account_balance(OLD.source_account_id);
    END IF;
    IF OLD.goal_id IS DISTINCT FROM NEW.goal_id THEN
      PERFORM public.recalculate_goal_saved_amount(OLD.goal_id);
    END IF;
    PERFORM public.recalculate_account_balance(NEW.source_account_id);
    PERFORM public.recalculate_goal_saved_amount(NEW.goal_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_account_balance(OLD.source_account_id);
    PERFORM public.recalculate_goal_saved_amount(OLD.goal_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_goal_contributions_sync ON public.goal_contributions;
CREATE TRIGGER trg_goal_contributions_sync
AFTER INSERT OR UPDATE OR DELETE ON public.goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_goal_contribution();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_contributions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Expense Categories policies
CREATE POLICY "Users can view system and own categories" ON public.expense_categories
  FOR SELECT USING (is_system = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Receipts policies
CREATE POLICY "Users can view own receipts" ON public.receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipts" ON public.receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receipts" ON public.receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receipts" ON public.receipts FOR DELETE USING (auth.uid() = user_id);

-- Receipt Items policies
CREATE POLICY "Users can view own receipt items" ON public.receipt_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipt items" ON public.receipt_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receipt items" ON public.receipt_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receipt items" ON public.receipt_items FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Savings Goals policies
CREATE POLICY "Users can view own savings goals" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings goals" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings goals" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings goals" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- Goal Contributions policies
CREATE POLICY "Users can view own goal contributions" ON public.goal_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal contributions" ON public.goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal contributions" ON public.goal_contributions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goal contributions" ON public.goal_contributions FOR DELETE USING (auth.uid() = user_id);

-- Recurring Contributions policies
CREATE POLICY "Users can view own recurring contributions" ON public.recurring_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring contributions" ON public.recurring_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring contributions" ON public.recurring_contributions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring contributions" ON public.recurring_contributions FOR DELETE USING (auth.uid() = user_id);

-- Seed canonical Pennywise Expense Categories
INSERT INTO public.expense_categories (slug, name, category_type, icon, color, is_system)
VALUES
  ('food-dining', 'Food & Dining', 'expense', 'utensils', '#191B19', TRUE),
  ('groceries', 'Groceries', 'expense', 'shopping-basket', '#7FB069', TRUE),
  ('shopping', 'Shopping', 'expense', 'shopping-bag', '#D4A373', TRUE),
  ('transportation', 'Transportation', 'expense', 'car', '#4A7C59', TRUE),
  ('entertainment', 'Entertainment', 'expense', 'film', '#8E9AAF', TRUE),
  ('bills-utilities', 'Bills & Utilities', 'expense', 'zap', '#E07A5F', TRUE),
  ('healthcare', 'Healthcare', 'expense', 'heart-pulse', '#D66853', TRUE),
  ('education', 'Education', 'expense', 'graduation-cap', '#5C80BC', TRUE),
  ('travel', 'Travel', 'expense', 'plane', '#3D5A80', TRUE),
  ('personal-care', 'Personal Care', 'expense', 'sparkles', '#B5838D', TRUE),
  ('luxury', 'Luxury', 'expense', 'gem', '#6D597A', TRUE),
  ('other', 'Other', 'expense', 'circle-dot', '#777F77', TRUE),
  ('income', 'Income', 'income', 'arrow-down-left', '#2E7D32', TRUE)
ON CONFLICT DO NOTHING;

