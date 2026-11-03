import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { MobileAppShell } from '@/components/layout/mobile-app-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard — Pennywise',
  description: 'Manage personal expenses, AI receipt scans, goals, and accounts.',
};

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login?next=/dashboard');
    }
  }

  return <MobileAppShell />;
}

