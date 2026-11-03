import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEffectiveServerUser } from '@/lib/server-auth';

const ProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(80),
  currency: z.string().min(1).max(5).default('INR'),
});

export async function GET() {
  try {
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: profile?.email || user.email,
        fullName: profile?.full_name || user.fullName,
        currency: profile?.currency || user.currency,
        createdAt: profile?.created_at || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getEffectiveServerUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured' },
        { status: 503 }
      );
    }

    const { user, supabase } = auth;
    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid profile information' },
        { status: 400 }
      );
    }

    const { fullName, currency } = parsed.data;

    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || null,
        full_name: fullName,
        currency,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email || user.email,
        fullName: updated.full_name,
        currency: updated.currency,
        createdAt: updated.created_at,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
