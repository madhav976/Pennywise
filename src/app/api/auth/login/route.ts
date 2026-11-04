import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email ? String(body.email).trim().toLowerCase() : '';
    const password = body?.password ? String(body.password) : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { success: false, error: 'Supabase authentication service is not configured on the server.' },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Ensure profile row exists in public.profiles
    const admin = createAdminSupabase();
    let profileData: { full_name?: string; currency?: string } | null = null;
    if (admin) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('full_name, currency')
        .eq('id', data.user.id)
        .maybeSingle();

      profileData = existingProfile;

      if (!existingProfile) {
        const defaultName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split('@')[0];
        const defaultCurrency =
          data.user.user_metadata?.currency || 'INR';

        await admin.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: defaultName,
          currency: defaultCurrency,
        });
      }
    }

    const fullName =
      profileData?.full_name ||
      data.user.user_metadata?.full_name ||
      email.split('@')[0];
    const currency =
      profileData?.currency ||
      data.user.user_metadata?.currency ||
      'INR';

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          fullName,
          currency,
        },
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
