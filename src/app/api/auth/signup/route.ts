import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';

const SignupSchema = z.object({
  fullName: z.string().trim().min(1, 'Please enter your full name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  currency: z.string().default('INR'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = SignupSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || 'Invalid input data.',
        },
        { status: 400 }
      );
    }

    const { fullName, email, password, currency } = parseResult.data;

    const admin = createAdminSupabase();
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase admin client is not configured on the server.',
        },
        { status: 500 }
      );
    }

    // 1. Check if a user with this email already exists in public.profiles or auth.users
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists. Please sign in.',
        },
        { status: 409 }
      );
    }

    // 2. Create the user in Supabase Auth securely via admin client
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        currency,
      },
    });

    if (authError || !authData?.user) {
      // Check for duplicate in auth.users
      if (
        authError?.message?.toLowerCase().includes('already registered') ||
        authError?.message?.toLowerCase().includes('already exists')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email already exists. Please sign in.',
          },
          { status: 409 }
        );
      }

      // Check for trigger failure in Supabase database
      if (
        authError?.message?.includes('Database error') ||
        authError?.message?.includes('saving new user') ||
        authError?.message?.includes('creating new user')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Supabase database error: A trigger on auth.users failed. Please execute migration 20261103000003_fix_auth_trigger_and_profiles.sql in the Supabase SQL editor to drop the failing trigger.',
            triggerError: true,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: authError?.message || 'Failed to create user in Supabase Authentication.',
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 3. Persist the user profile into public.profiles
    const now = new Date().toISOString();
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        currency,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('Error inserting profile after auth user creation:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'Account created in Auth, but profile persistence failed: ' + profileError.message,
          userId,
        },
        { status: 500 }
      );
    }

    // 4. Seed initial default account
    const { data: existingAccounts } = await admin
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingAccounts || existingAccounts.length === 0) {
      await admin.from('accounts').insert({
        user_id: userId,
        name: 'Main Account',
        account_type: 'salary',
        opening_balance: 0,
        current_balance: 0,
        icon: 'Landmark',
        description: 'Primary financial account',
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          email,
          fullName,
          currency,
          createdAt: now,
        },
        message: 'Account created successfully in Supabase.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Unexpected error in /api/auth/signup:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'An unexpected error occurred during signup.',
      },
      { status: 500 }
    );
  }
}
