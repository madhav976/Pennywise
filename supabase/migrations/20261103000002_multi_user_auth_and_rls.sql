-- ============================================================================
-- PENNYWISE: Migration 20261103000002_multi_user_auth_and_rls
-- Multi-User Authentication, Automated Profile Trigger & Strict RLS Policies
-- ============================================================================

-- 1. Automated Profile Creation Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_currency TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Pennywise User'
  );
  v_currency := COALESCE(NEW.raw_user_meta_data->>'currency', 'INR');

  -- Insert or update user profile
  INSERT INTO public.profiles (id, email, full_name, currency, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_full_name, v_currency, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      currency = COALESCE(EXCLUDED.currency, public.profiles.currency),
      updated_at = NOW();

  -- Seed initial Default Account for zero-friction start if none exists
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = NEW.id) THEN
    INSERT INTO public.accounts (user_id, name, account_type, opening_balance, current_balance, icon, description)
    VALUES (NEW.id, 'Main Account', 'salary', 0.00, 0.00, 'Landmark', 'Primary financial account');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Composite Constraints to guarantee same-user integrity across relational models
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_accounts_id_user_id'
  ) THEN
    ALTER TABLE public.accounts ADD CONSTRAINT uq_accounts_id_user_id UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_receipts_id_user_id'
  ) THEN
    ALTER TABLE public.receipts ADD CONSTRAINT uq_receipts_id_user_id UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_savings_goals_id_user_id'
  ) THEN
    ALTER TABLE public.savings_goals ADD CONSTRAINT uq_savings_goals_id_user_id UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_recurring_contributions_id_user_id'
  ) THEN
    ALTER TABLE public.recurring_contributions ADD CONSTRAINT uq_recurring_contributions_id_user_id UNIQUE (id, user_id);
  END IF;
END $$;

-- 3. Update Row Level Security Policies for Strict Multi-Tenant Isolation
-- Clean existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;

DROP POLICY IF EXISTS "Users can view system and own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.expense_categories;

DROP POLICY IF EXISTS "Users can view own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON public.receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON public.receipts;

DROP POLICY IF EXISTS "Users can view own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can insert own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can update own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can delete own receipt items" ON public.receipt_items;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can insert own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can update own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can delete own savings goals" ON public.savings_goals;

DROP POLICY IF EXISTS "Users can view own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can insert own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can update own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can delete own goal contributions" ON public.goal_contributions;

DROP POLICY IF EXISTS "Users can view own recurring contributions" ON public.recurring_contributions;
DROP POLICY IF EXISTS "Users can insert own recurring contributions" ON public.recurring_contributions;
DROP POLICY IF EXISTS "Users can update own recurring contributions" ON public.recurring_contributions;
DROP POLICY IF EXISTS "Users can delete own recurring contributions" ON public.recurring_contributions;

-- Ensure RLS is active on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_contributions ENABLE ROW LEVEL SECURITY;

-- 3.1 PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3.2 ACCOUNTS POLICIES
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- 3.3 EXPENSE CATEGORIES POLICIES
CREATE POLICY "Users can view system and own categories" ON public.expense_categories
  FOR SELECT USING (is_system = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.expense_categories
  FOR UPDATE USING (auth.uid() = user_id AND is_system = FALSE) WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own categories" ON public.expense_categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- 3.4 RECEIPTS POLICIES
CREATE POLICY "Users can view own receipts" ON public.receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON public.receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON public.receipts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON public.receipts
  FOR DELETE USING (auth.uid() = user_id);

-- 3.5 RECEIPT ITEMS POLICIES (Enforce same-user relationship with parent receipt)
CREATE POLICY "Users can view own receipt items" ON public.receipt_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt items" ON public.receipt_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own receipt items" ON public.receipt_items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own receipt items" ON public.receipt_items
  FOR DELETE USING (auth.uid() = user_id);

-- 3.6 TRANSACTIONS POLICIES (Enforce same-user relationship with account and receipt)
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.user_id = auth.uid()
    )
    AND (
      receipt_id IS NULL OR EXISTS (
        SELECT 1 FROM public.receipts r
        WHERE r.id = receipt_id AND r.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.user_id = auth.uid()
    )
    AND (
      receipt_id IS NULL OR EXISTS (
        SELECT 1 FROM public.receipts r
        WHERE r.id = receipt_id AND r.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 3.7 SAVINGS GOALS POLICIES
CREATE POLICY "Users can view own savings goals" ON public.savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals" ON public.savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals" ON public.savings_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals" ON public.savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- 3.8 GOAL CONTRIBUTIONS POLICIES (Enforce same-user relationship with goal and source account)
CREATE POLICY "Users can view own goal contributions" ON public.goal_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal contributions" ON public.goal_contributions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.savings_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = source_account_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own goal contributions" ON public.goal_contributions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.savings_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = source_account_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own goal contributions" ON public.goal_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- 3.9 RECURRING CONTRIBUTIONS POLICIES (Enforce same-user relationship with goal and source account)
CREATE POLICY "Users can view own recurring contributions" ON public.recurring_contributions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring contributions" ON public.recurring_contributions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.savings_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = source_account_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recurring contributions" ON public.recurring_contributions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.savings_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = source_account_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recurring contributions" ON public.recurring_contributions
  FOR DELETE USING (auth.uid() = user_id);

