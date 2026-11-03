import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { SignupForm } from '@/components/auth/signup-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create Account — Pennywise',
  description: 'Create a new Pennywise personal expense account.',
};

export default async function SignupPage() {
  const supabase = await createServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    }
  }

  return <SignupForm />;
}

