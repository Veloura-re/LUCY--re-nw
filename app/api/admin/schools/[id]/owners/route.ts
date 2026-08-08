import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { sendInviteEmail } from '@/lib/email';

// GET - List all owners and pending invites for a school
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

            // Fetch active owners
            const { data: users } = await supabase
                .from('User')
                .select('id, name, email, photoUrl, createdAt')
                .eq('schoolId', resolvedParams.id)
                .eq('role', 'OWNER');

            // Fetch pending invites
            const { data: invites } = await supabase
                .from('InviteToken')
                .select('id, email, token, createdAt, expiresAt')
                .eq('schoolId', resolvedParams.id)
                .eq('role', 'OWNER')
                .is('usedAt', null);

            return NextResponse.json({
                owners: users || [],
                invites: invites || []
            });
        }

        const activePrincipals = await prisma.user.findMany({
            where: { schoolId: resolvedParams.id, role: 'OWNER' },
            select: { id: true, name: true, email: true, photoUrl: true, createdAt: true }
        });

        const pendingInvites = await prisma.inviteToken.findMany({
            where: { schoolId: resolvedParams.id, role: 'OWNER', usedAt: null },
            select: { id: true, email: true, token: true, createdAt: true, expiresAt: true }
        });

        return NextResponse.json({
            owners: activePrincipals,
            invites: pendingInvites
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Invite a new owner to this school
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
            
            const { count: ownersCount } = await supabase.from('User').select('*', { count: 'exact', head: true }).eq('schoolId', resolvedParams.id).eq('role', 'OWNER');
            const { count: invitesCount } = await supabase.from('InviteToken').select('*', { count: 'exact', head: true }).eq('schoolId', resolvedParams.id).eq('role', 'OWNER').is('usedAt', null);
            
            if ((ownersCount || 0) + (invitesCount || 0) >= 1) {
                return NextResponse.json({ error: 'School already has an Owner or pending Owner invite' }, { status: 400 });
            }

            const { data: school } = await supabase.from('School').select('name').eq('id', resolvedParams.id).single();
            if (school) schoolName = school.name;

            const { error: invErr } = await supabase.from('InviteToken').insert({
                id: globalThis.crypto.randomUUID(),
                token,
                email,
                role: 'OWNER',
                schoolId: resolvedParams.id,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });
            if (invErr) throw invErr;
        } else {
            const existingOwnersCount = await prisma.user.count({ where: { schoolId: resolvedParams.id, role: 'OWNER' }});
            const existingInvitesCount = await prisma.inviteToken.count({ where: { schoolId: resolvedParams.id, role: 'OWNER', usedAt: null }});

            if (existingOwnersCount + existingInvitesCount >= 1) {
                return NextResponse.json({ error: 'School already has an Owner or pending Owner invite' }, { status: 400 });
            }

            const school = await prisma.school.findUnique({ where: { id: resolvedParams.id }});
            if (school) schoolName = school.name;

            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'OWNER',
                    schoolId: resolvedParams.id,
                    expiresAt
                }
            });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;

        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'OWNER', resolvedParams.id);
        const res = emailResult as any;

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'school', ip: _ip || undefined });
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
