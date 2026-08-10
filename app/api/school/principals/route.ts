import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { createClient as createEdgeClient } from '@supabase/supabase-js';

async function verifyOwner() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    if (prisma) {
        const dbUser = await prisma.user.findUnique({ where: { id: authUser.id }});
        if (!dbUser || dbUser.role !== 'OWNER' || !dbUser.schoolId) return null;
        return dbUser;
    } else {
        const edgeSupabase = createEdgeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: dbUser } = await edgeSupabase.from('User').select('*').eq('id', authUser.id).single();
        if (!dbUser || dbUser.role !== 'OWNER' || !dbUser.schoolId) return null;
        return dbUser;
    }
}

export async function GET(request: Request) {
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        if (!prisma) {
            const supabase = createEdgeClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: users } = await supabase
                .from('User')
                .select('id, name, email, photoUrl, createdAt, preferences')
                .eq('schoolId', owner.schoolId)
                .eq('role', 'PRINCIPAL');

            const { data: invites } = await supabase
                .from('InviteToken')
                .select('id, email, token, createdAt, expiresAt')
                .eq('schoolId', owner.schoolId)
                .eq('role', 'PRINCIPAL')
                .is('usedAt', null);

            return NextResponse.json({ principals: users || [], invites: invites || [] });
        }

        const activePrincipals = await prisma.user.findMany({
            where: { schoolId: owner.schoolId, role: 'PRINCIPAL' },
            select: { id: true, name: true, email: true, photoUrl: true, createdAt: true, preferences: true }
        });

        const pendingInvites = await prisma.inviteToken.findMany({
            where: { schoolId: owner.schoolId, role: 'PRINCIPAL', usedAt: null },
            select: { id: true, email: true, token: true, createdAt: true, expiresAt: true }
        });

        return NextResponse.json({ principals: activePrincipals, invites: pendingInvites });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { email } = await request.json() as { email: string };
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        if (prisma) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (existingUser.schoolId && existingUser.schoolId !== owner.schoolId) {
                    return NextResponse.json({ error: 'Email is already registered to another institution.' }, { status: 400 });
                }
                if (existingUser.schoolId === owner.schoolId && existingUser.verified) {
                    return NextResponse.json({ error: 'User is already an active member of this school.' }, { status: 400 });
                }
                // If schoolId is null, they were deleted or are unassigned. Let the invite proceed so they can be re-linked.
            }

            const existingInvite = await prisma.inviteToken.findFirst({ where: { email } });
            if (existingInvite) {
                // If they have an existing invite, just delete the old one to issue a new one
                await prisma.inviteToken.delete({ where: { id: existingInvite.id } });
            }
        }

        let token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        let schoolName = "Institution";
        
        if (!prisma) {
            const supabase = createEdgeClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const { data: school } = await supabase.from('School').select('name').eq('id', owner.schoolId).single();
            if (school) schoolName = school.name;

            const { error: invErr } = await supabase.from('InviteToken').insert({
                id: globalThis.crypto.randomUUID(),
                token,
                email,
                role: 'PRINCIPAL',
                schoolId: owner.schoolId,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            });
            if (invErr) throw invErr;
        } else {
            const school = await prisma.school.findUnique({ where: { id: owner.schoolId }});
            if (school) schoolName = school.name;

            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'PRINCIPAL',
                    schoolId: owner.schoolId,
                    expiresAt
                }
            });
        }

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;

        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'PRINCIPAL', owner.schoolId);
        const res = emailResult as any;

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = undefined; // verifyOwner scoped
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({
            inviteToken: token,
            inviteUrl,
            emailSent: res.success && !res.skipped,
            simulated: res.simulated || false,
            emailError: res.error || null,
            skipped: res.skipped || false
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
