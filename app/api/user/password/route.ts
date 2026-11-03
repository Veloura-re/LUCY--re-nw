import { publicErrorMessage } from '@/lib/security';
import { createClient } from '@/utils/supabase/server';
import { revokeTrustedDevices } from '@/lib/login-otp';
import { NextResponse } from 'next/server';
import { reportServerError } from '@/lib/error-capture';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    // Not behind the device-session check: the password reset page arrives here with a recovery-link session.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { newPassword }: any = await request.json().catch(() => ({}));

        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            void reportServerError(error, { status: 500 });
            return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
        }

        // A new password invalidates every browser that was trusted to skip the emailed code.
        await revokeTrustedDevices(user.id).catch((e) => console.warn('[password] Could not revoke trusted devices:', e?.message));

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'user', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
