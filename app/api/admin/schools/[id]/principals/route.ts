import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { sendInviteEmail } from '@/lib/email';

// GET - List all principals and pending invites for a school
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
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
                .eq('schoolId', resolvedParams.id)
                .eq('role', 'PRINCIPAL');

            // Fetch pending invites
            const { data: invites } = await supabase
                .from('InviteToken')
                .select('id, email, token, createdAt, expiresAt')
                .eq('schoolId', resolvedParams.id)
                .eq('role', 'PRINCIPAL')
                .is('usedAt', null);

            return NextResponse.json({
                principals: users || [],
                invites: invites || []
            });
        }

        const activePrincipals = await prisma.user.findMany({
            where: { schoolId: resolvedParams.id, role: 'PRINCIPAL' },
            select: { id: true, name: true, email: true, photoUrl: true, createdAt: true }
        });

        const pendingInvites = await prisma.inviteToken.findMany({
            where: { schoolId: resolvedParams.id, role: 'PRINCIPAL', usedAt: null },
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
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { email } = await request.json() as { email: string };
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

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
            
            const { data: school } = await supabase.from('School').select('name').eq('id', resolvedParams.id).single();
            if (school) schoolName = school.name;

            const { error: invErr } = await supabase.from('InviteToken').insert({
                id: globalThis.crypto.randomUUID(),
                token,
                email,
                role: 'PRINCIPAL',
                schoolId: resolvedParams.id,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });
            if (invErr) throw invErr;
        } else {
            const school = await prisma.school.findUnique({ where: { id: resolvedParams.id }});
            if (school) schoolName = school.name;

            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'PRINCIPAL',
                    schoolId: resolvedParams.id,
                    expiresAt
                }
            });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;

        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'PRINCIPAL', resolvedParams.id);
        const res = emailResult as any;

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({
            inviteToken: token,
            inviteUrl,
            emailSent: res.success && !res.skipped
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
