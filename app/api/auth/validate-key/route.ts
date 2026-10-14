import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { reportServerError } from '@/lib/error-capture';

async function fetchWithRetry(fn: () => PromiseLike<any>, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // backoff
        }
    }
}

export async function POST(request: Request) {
    try {
        const { key } = (await request.json()) as { key: string };

        if (!key) {
            return NextResponse.json({ error: 'Deployment key is required' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: invite, error: inviteError } = await fetchWithRetry(() => 
            supabaseAdmin.from('InviteToken').select('*').eq('token', key).maybeSingle()
        );

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Invalid deployment key' }, { status: 404 });
        }

        let schoolName = 'New School';
        if (invite.schoolId) {
            const { data: school } = await fetchWithRetry(() => 
                supabaseAdmin.from('School').select('name').eq('id', invite.schoolId).maybeSingle()
            );
            
            if (school?.name) {
                schoolName = school.name;
            }
        }

        if (invite.usedAt) {
            return NextResponse.json({ error: 'This key has already been used' }, { status: 400 });
        }

        if (new Date(invite.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'This key has expired' }, { status: 400 });
        }

        if (invite.role !== 'PRINCIPAL') {
            return NextResponse.json({ error: 'This key is not for a Director account' }, { status: 403 });
        }

        return NextResponse.json({
            valid: true,
            schoolName: schoolName,
            email: invite.email
        });

    } catch (error: any) {
        console.error('Validation Error:', error);
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error, 'Internal server error') }, { status: 500 });
    }
}
