import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
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
            return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
        }

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
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
