import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendRecoveryEmail } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const { email } = await request.json() as { email: string };

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Verify user exists in the local database (with Supabase REST fallback if Prisma is null)
        let userExists = false;

        if (prisma) {
            const user = await prisma.user.findUnique({
                where: { email }
            });
            userExists = !!user;
        } else {
            console.warn('[Forgot Password API] Prisma is null/unavailable. Falling back to Supabase REST...');
            const supabaseAdmin = createAdminClient();
            const { data: dbUser, error: dbError } = await supabaseAdmin
                .from('User')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (dbError) {
                console.error('[Forgot Password API] Supabase REST fallback query failed:', dbError.message);
            }
            userExists = !!dbUser;
        }

        if (!userExists) {
            // Return success even if email doesn't exist to prevent enumeration attacks
            return NextResponse.json({ success: true, message: 'Recovery instructions dispatched if the account exists.' });
        }

        // 2. Initialize Supabase Admin Client
        const supabaseAdmin = createAdminClient();

        // 3. Generate Auth Link (Recovery type)
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
            }
        });

        if (linkError) {
            console.error('Link generation error:', linkError.message);
            return NextResponse.json({ error: 'Failed to generate secure recovery protocol link.' }, { status: 500 });
        }

        // Guard: user exists in Prisma but NOT in Supabase Auth
        if (!data?.user) {
            console.error(`Forgot password: ${email} is in Prisma but has no Supabase Auth account.`);
            // Return a safe success response to prevent enumeration
            return NextResponse.json({ success: true, message: 'Recovery instructions dispatched if the account exists.' });
        }

        if (!data?.properties?.action_link) {
            console.error('Forgot password: generateLink returned no action_link for', email);
            return NextResponse.json({ error: 'Failed to generate secure recovery protocol link.' }, { status: 500 });
        }

        const recoveryLink = data.properties.action_link;

        // 4. Send Custom Premium Email via Resend
        const emailResult = await sendRecoveryEmail(email, recoveryLink);

        if (!emailResult.success) {
            console.error('Resend email error:', emailResult.error);
            return NextResponse.json({ error: 'SMTP gateway transmission failure.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Recovery instructions dispatched.' });
    } catch (e: any) {
        console.error('Forgot password API error:', e);
        return NextResponse.json({ error: e.message || 'Internal server error.' }, { status: 500 });
    }
}
