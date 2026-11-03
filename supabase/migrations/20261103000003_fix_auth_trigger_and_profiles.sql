-- ============================================================================
-- PENNYWISE: Migration 20261103000003_fix_auth_trigger_and_profiles
-- Fix auth.users trigger error, ensure non-blocking profile creation,
-- and reinforce public.profiles persistence with strict RLS policies.
-- ============================================================================

-- 1. DROP BROKEN TRIGGER ON auth.users
-- The previous on_auth_user_created trigger raised unhandled exceptions during
-- GoTrue user creation, blocking signup with "Database error saving new user".
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. CREATE FAIL-SAFE, NON-BLOCKING TRIGGER FUNCTION
-- This trigger safely attempts to seed public.profiles upon auth.users creation.
-- Crucially, it includes an EXCEPTION block so that any profile or table issue
-- NEVER aborts the auth.users signup transaction.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_catalog
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

  -- Safely seed default account if none exists
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = NEW.id) THEN
    INSERT INTO public.accounts (user_id, name, account_type, opening_balance, current_balance, icon, description)
    VALUES (NEW.id, 'Main Account', 'salary', 0.00, 0.00, 'Landmark', 'Primary financial account');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log warning to PostgreSQL log but NEVER block user registration
  RAISE WARNING 'handle_new_user trigger non-fatal warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. RE-ATTACH TRIGGER TO auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ENSURE public.profiles TABLE STRUCTURE & CONSTRAINTS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Pennywise User',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONFIGURE ROW LEVEL SECURITY ON public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 6. GRANT PERMISSIONS TO POSTGREST ROLES
GRANT ALL ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.profiles TO anon;

