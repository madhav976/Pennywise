import 'server-only';
import { createServerSupabase } from './supabase/server';
import { createAdminSupabase } from './supabase/admin';

export const DEFAULT_DEV_USER_ID = '00000000-0000-4000-8000-000000000001';

export interface CurrentServerUser {
  id: string;
  email: string;
  fullName: string;
  currency: string;
  isDevUser: boolean;
}

/**
 * Resolves the authenticated user or development user identity on the server.
 * Ensures the user profile exists in public.profiles and returns the Supabase admin client
 * configured with service_role permissions for secure database operations.
 */
export async function getEffectiveServerUser(options?: {
  allowDevFallback?: boolean;
}): Promise<{
  user: CurrentServerUser;
  supabase: NonNullable<ReturnType<typeof createAdminSupabase>>;
} | null> {
  const adminClient = createAdminSupabase();
  if (!adminClient) {
    return null;
  }

  // 1. Check for real authenticated Supabase user session from cookies
  try {
    const serverClient = await createServerSupabase();
    if (serverClient) {
      const {
        data: { user: authUser },
      } = await serverClient.auth.getUser();

      if (authUser?.id) {
        // Fetch or ensure profile in public.profiles
        const { data: profile } = await adminClient
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        const fullName =
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          'Pennywise Member';
        const currency =
          profile?.currency ||
          authUser.user_metadata?.currency ||
          'INR';

        if (!profile) {
          await adminClient.from('profiles').upsert({
            id: authUser.id,
            email: authUser.email || null,
            full_name: fullName,
            currency: currency,
          });
        }

        return {
          user: {
            id: authUser.id,
            email: authUser.email || '',
            fullName,
            currency,
            isDevUser: false,
          },
          supabase: adminClient,
        };
      }
    }
  } catch {
    // Session read error
  }

  // 2. In production or strict mode, never fall back to development identity
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const allowDev = options?.allowDevFallback ?? !isProduction;

  if (!allowDev) {
    return null;
  }

  // 3. Local offline development fallback
  const devUserId = process.env.PENNYWISE_DEV_USER_ID || DEFAULT_DEV_USER_ID;

  const { data: devProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', devUserId)
    .maybeSingle();

  if (!devProfile) {
    await adminClient.from('profiles').upsert({
      id: devUserId,
      email: null,
      full_name: 'Pennywise Development User',
      currency: 'INR',
    });
  }

  return {
    user: {
      id: devUserId,
      email: devProfile?.email || 'dev@pennywise.local',
      fullName: devProfile?.full_name || 'Pennywise Development User',
      currency: devProfile?.currency || 'INR',
      isDevUser: true,
    },
    supabase: adminClient,
  };
}
