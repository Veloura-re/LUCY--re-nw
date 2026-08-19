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
        const { email } = (await request.json().catch(() => ({}))) as { email: string };
        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        let token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        let schoolName = "Institution";
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

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'PRINCIPAL', resolvedParams.id);
        const res = emailResult as any;

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: resolvedParams.id, action: 'INVITE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
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
