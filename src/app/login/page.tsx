import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign In — Pennywise',
  description: 'Sign in to your Pennywise personal expense tracker.',
};

export default async function LoginPage() {
  const supabase = await createServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    }
  }

  return <LoginForm />;
}

