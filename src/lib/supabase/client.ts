import { createBrowserClient } from '@supabase/ssr';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      key &&
      url.startsWith('https://') &&
      !url.includes('your-project') &&
      key !== 'your-supabase-publishable-key' &&
      key !== 'your-supabase-anon-key'
  );
}

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

  if (typeof window === 'undefined') {
    return createBrowserClient(url, key);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(url, key);
  }

  return browserClientInstance;
}
