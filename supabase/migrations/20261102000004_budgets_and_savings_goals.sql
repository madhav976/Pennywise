-- ====================================================================
-- PULSE Finance Tracker - Budgets, Savings Goals & Account Metadata
-- Migration: 20261102000004_budgets_and_savings_goals.sql
-- ====================================================================

-- 1. Extend financial_accounts with description, color, and icon
ALTER TABLE public.financial_accounts
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#A99BFF',
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'credit-card';

-- 2. Budget Period Enum
DO $$ BEGIN
    CREATE TYPE budget_period AS ENUM (
        'weekly',
        'monthly',
        'quarterly',
        'yearly',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period budget_period NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    alert_thresholds_triggered JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_budget_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_budget_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_active ON public.budgets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_budgets_user_dates ON public.budgets(user_id, start_date, end_date);

CREATE TRIGGER trg_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 4. Savings Goals Table
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    target_amount NUMERIC(15, 4) NOT NULL,
    initial_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    target_date DATE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'target',
    color VARCHAR(7) DEFAULT '#A99BFF',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_goal_target_positive CHECK (target_amount > 0),
    CONSTRAINT chk_goal_initial_non_negative CHECK (initial_amount >= 0),
    CONSTRAINT chk_goal_current_non_negative CHECK (current_amount >= 0),
    CONSTRAINT chk_goal_status CHECK (status IN ('active', 'paused', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_status ON public.savings_goals(user_id, status);

CREATE TRIGGER trg_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 5. Savings Goal Contributions Table
CREATE TABLE IF NOT EXISTS public.savings_goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    contribution_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_contribution_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON public.savings_goal_contributions(goal_id, contribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON public.savings_goal_contributions(user_id, contribution_date DESC);

-- 6. Row Level Security (RLS) for Budgets & Savings Goals
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
CREATE POLICY "budgets_select_own" ON public.budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;
CREATE POLICY "budgets_delete_own" ON public.budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_select_own" ON public.savings_goals;
CREATE POLICY "savings_goals_select_own" ON public.savings_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_insert_own" ON public.savings_goals;
CREATE POLICY "savings_goals_insert_own" ON public.savings_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_update_own" ON public.savings_goals;
CREATE POLICY "savings_goals_update_own" ON public.savings_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_delete_own" ON public.savings_goals;
CREATE POLICY "savings_goals_delete_own" ON public.savings_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contributions_select_own" ON public.savings_goal_contributions;
CREATE POLICY "goal_contributions_select_own" ON public.savings_goal_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contributions_insert_own" ON public.savings_goal_contributions;
CREATE POLICY "goal_contributions_insert_own" ON public.savings_goal_contributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contributions_delete_own" ON public.savings_goal_contributions;
CREATE POLICY "goal_contributions_delete_own" ON public.savings_goal_contributions FOR DELETE TO authenticated USING (auth.uid() = user_id);

