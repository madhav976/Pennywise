-- ====================================================================
-- PULSE Finance Tracker Module - Core Database Schema
-- Migration: 20261102000001_finance_schema.sql
-- ====================================================================

-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. ENUMS DEFINITION
-- --------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'cash',
        'checking',
        'savings',
        'credit_card',
        'digital_wallet',
        'investment',
        'loan'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE category_type AS ENUM (
        'income',
        'expense'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'income',
        'expense',
        'transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'cash',
        'upi',
        'debit_card',
        'credit_card',
        'bank_transfer',
        'digital_wallet',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurring_frequency AS ENUM (
        'daily',
        'weekly',
        'biweekly',
        'monthly',
        'quarterly',
        'yearly',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurring_log_status AS ENUM (
        'success',
        'failed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- --------------------------------------------------------------------
-- 2. CORE TABLES
-- --------------------------------------------------------------------

-- Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Financial Accounts Table
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type account_type NOT NULL,
    institution_name TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    opening_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    credit_limit NUMERIC(15, 4),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_user_account_name UNIQUE (user_id, account_name),
    CONSTRAINT chk_credit_limit CHECK (
        (account_type = 'credit_card' AND (credit_limit IS NULL OR credit_limit >= 0)) OR
        (account_type <> 'credit_card' AND credit_limit IS NULL)
    )
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_type category_type NOT NULL,
    icon TEXT,
    color VARCHAR(7),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_category_ownership CHECK (
        (is_system = TRUE AND user_id IS NULL) OR
        (is_system = FALSE AND user_id IS NOT NULL)
    ),
    CONSTRAINT uq_category_per_user UNIQUE NULLS NOT DISTINCT (user_id, name, category_type)
);

-- Recurring Transactions Table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    target_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    merchant_name TEXT,
    payment_method payment_method NOT NULL DEFAULT 'other',
    frequency recurring_frequency NOT NULL,
    interval_count INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    next_execution_date DATE NOT NULL,
    last_executed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT chk_recurring_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_recurring_interval CHECK (interval_count >= 1),
    CONSTRAINT chk_recurring_end_date CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_recurring_transfer_accounts CHECK (
        (transaction_type = 'transfer' AND target_account_id IS NOT NULL AND target_account_id <> account_id) OR
        (transaction_type <> 'transfer' AND target_account_id IS NULL)
    ),
    CONSTRAINT chk_recurring_category_type CHECK (
        (transaction_type = 'transfer' AND category_id IS NULL) OR
        (transaction_type <> 'transfer' AND category_id IS NOT NULL)
    )
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(15, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    merchant_name TEXT,
    payment_method payment_method NOT NULL DEFAULT 'other',
    transaction_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    reference_number TEXT,
    transfer_pair_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    transfer_role VARCHAR(12) CHECK (transfer_role IN ('source', 'destination', NULL)),
    recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_transfer_consistency CHECK (
        (transaction_type = 'transfer' AND transfer_role IS NOT NULL AND category_id IS NULL) OR
        (transaction_type <> 'transfer' AND transfer_role IS NULL AND category_id IS NOT NULL)
    )
);

-- Recurring Transaction Execution Logs
CREATE TABLE IF NOT EXISTS public.recurring_transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_transaction_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
    executed_date DATE NOT NULL,
    generated_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    status recurring_log_status NOT NULL,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_recurring_exec_date UNIQUE (recurring_transaction_id, executed_date)
);

-- Transaction Audit Logs Table
CREATE TABLE IF NOT EXISTS public.transaction_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    performed_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- --------------------------------------------------------------------
-- 3. INDEXING STRATEGY
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON public.transactions(user_id, account_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair ON public.transactions(transfer_pair_id)
WHERE transfer_pair_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_search ON public.transactions(user_id, transaction_date DESC)
INCLUDE (amount, transaction_type, category_id, account_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON public.financial_accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, category_type, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_exec_queue ON public.recurring_transactions(is_active, next_execution_date)
WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_txn ON public.transaction_audit_logs(user_id, transaction_id);

-- --------------------------------------------------------------------
-- 4. DATABASE TRIGGERS & PROCEDURES
-- --------------------------------------------------------------------

-- Trigger Function: Set updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_financial_accounts_updated_at
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Trigger Function: Auto-create profile upon Supabase auth signup
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, preferred_currency, timezone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'preferred_currency', 'USD'),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- Trigger Function: Automatic Audit Logging for Transactions
CREATE OR REPLACE FUNCTION public.fn_audit_transactions()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(20);
    v_user_id UUID;
    v_txn_id UUID;
    v_old_json JSONB := NULL;
    v_new_json JSONB := NULL;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'INSERT';
        v_user_id := NEW.user_id;
        v_txn_id := NEW.id;
        v_new_json := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
            v_action := 'SOFT_DELETE';
        ELSIF (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL) THEN
            v_action := 'RESTORE';
        ELSE
            v_action := 'UPDATE';
        END IF;
        v_user_id := NEW.user_id;
        v_txn_id := NEW.id;
        v_old_json := to_jsonb(OLD);
        v_new_json := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'HARD_DELETE';
        v_user_id := OLD.user_id;
        v_txn_id := OLD.id;
        v_old_json := to_jsonb(OLD);
    END IF;

    INSERT INTO public.transaction_audit_logs (
        transaction_id,
        user_id,
        action,
        previous_data,
        new_data,
        performed_by
    ) VALUES (
        v_txn_id,
        v_user_id,
        v_action,
        v_old_json,
        v_new_json,
        COALESCE(auth.uid(), v_user_id)
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_transaction_audit
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_transactions();

-- --------------------------------------------------------------------
-- 5. ACCOUNT BALANCE LEDGER RECONCILIATION FUNCTION
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reconcile_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_account_type account_type;
    v_opening_balance NUMERIC(15, 4);
    v_calculated_balance NUMERIC(15, 4);
    v_net_delta NUMERIC(15, 4) := 0;
BEGIN
    SELECT account_type, opening_balance 
    INTO v_account_type, v_opening_balance
    FROM public.financial_accounts
    WHERE id = p_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account with ID % not found', p_account_id;
    END IF;

    -- Calculate aggregate sum based on account type
    IF v_account_type = 'credit_card' OR v_account_type = 'loan' THEN
        -- Liability: Debt = Opening Debt + Expenses - Transfers In (Payments) + Incoming Adjustments
        SELECT COALESCE(SUM(
            CASE 
                WHEN transaction_type = 'expense' THEN amount
                WHEN transaction_type = 'income' THEN -amount
                WHEN transaction_type = 'transfer' AND transfer_role = 'destination' THEN -amount
                WHEN transaction_type = 'transfer' AND transfer_role = 'source' THEN amount
                ELSE 0
            END
        ), 0.0000)
        INTO v_net_delta
        FROM public.transactions
        WHERE account_id = p_account_id
          AND deleted_at IS NULL;

        v_calculated_balance := v_opening_balance + v_net_delta;
    ELSE
        -- Asset: Balance = Opening + Income - Expense + Transfers In - Transfers Out
        SELECT COALESCE(SUM(
            CASE 
                WHEN transaction_type = 'income' THEN amount
                WHEN transaction_type = 'expense' THEN -amount
                WHEN transaction_type = 'transfer' AND transfer_role = 'destination' THEN amount
                WHEN transaction_type = 'transfer' AND transfer_role = 'source' THEN -amount
                ELSE 0
            END
        ), 0.0000)
        INTO v_net_delta
        FROM public.transactions
        WHERE account_id = p_account_id
          AND deleted_at IS NULL;

        v_calculated_balance := v_opening_balance + v_net_delta;
    END IF;

    -- Synchronize stored balance
    UPDATE public.financial_accounts
    SET current_balance = v_calculated_balance,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_account_id;

    RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

