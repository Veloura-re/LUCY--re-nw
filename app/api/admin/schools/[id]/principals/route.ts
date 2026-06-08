import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';

// GET - List all principals and pending invites for a school
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { prisma } = require('@/lib/prisma');
        const isEdge = !prisma;

        if (isEdge) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch active principals
            const { data: users } = await supabase
                .from('User')
                .select('id, name, email, photoUrl, createdAt')
                .eq('schoolId', params.id)
                .eq('role', 'PRINCIPAL');

            // Fetch pending invites
            const { data: invites } = await supabase
                .from('InviteToken')
                .select('id, email, token, createdAt, expiresAt')
                .eq('schoolId', params.id)
                .eq('role', 'PRINCIPAL')
                .is('usedAt', null);

            return NextResponse.json({
                principals: users || [],
                invites: invites || []
            });
        }

        const activePrincipals = await prisma.user.findMany({
            where: { schoolId: params.id, role: 'PRINCIPAL' },
            select: { id: true, name: true, email: true, photoUrl: true, createdAt: true }
        });

        const pendingInvites = await prisma.inviteToken.findMany({
            where: { schoolId: params.id, role: 'PRINCIPAL', usedAt: null },
            select: { id: true, email: true, token: true, createdAt: true, expiresAt: true }
        });

        return NextResponse.json({
            principals: activePrincipals,
            invites: pendingInvites
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Invite a new principal to this school
export async function POST(request: Request, { params }: { params: { id: string } }) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { email } = await request.json() as { email: string };
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        const { prisma } = require('@/lib/prisma');
        let token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Fetch school name for email
        let schoolName = "Institution";
        
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const { data: school } = await supabase.from('School').select('name').eq('id', params.id).single();
            if (school) schoolName = school.name;

            const { error: invErr } = await supabase.from('InviteToken').insert({
                id: globalThis.crypto.randomUUID(),
                token,
                email,
                role: 'PRINCIPAL',
                schoolId: params.id,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });
            if (invErr) throw invErr;
        } else {
            const school = await prisma.school.findUnique({ where: { id: params.id }});
            if (school) schoolName = school.name;

            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'PRINCIPAL',
                    schoolId: params.id,
                    expiresAt
                }
            });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;

        const { sendInviteEmail } = await import('@/lib/email');
        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'PRINCIPAL', params.id);
        const res = emailResult as any;

        return NextResponse.json({
            inviteToken: token,
            inviteUrl,
            emailSent: res.success && !res.skipped
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
