import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { sendInviteEmail } from '@/lib/email';
import { reportServerError } from '@/lib/error-capture';

// GET - List all owners and pending invites for a school
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const activeOwners = await prisma.user.findMany({
            where: { schoolId: resolvedParams.id, role: 'OWNER' },
            select: { id: true, name: true, email: true, photoUrl: true, createdAt: true }
        });

        const pendingInvites = await prisma.inviteToken.findMany({
            where: { schoolId: resolvedParams.id, role: 'OWNER', usedAt: null },
            select: { id: true, email: true, token: true, createdAt: true, expiresAt: true }
        });

        return NextResponse.json({
            owners: activeOwners,
            invites: pendingInvites
        });
    } catch (error: any) {
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
}

// POST - Invite a new owner to this school
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

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
        const emailResult = await sendInviteEmail(email, inviteUrl, schoolName, token, 'OWNER', resolvedParams.id);
        const res = emailResult as any;

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: resolvedParams.id, action: 'INVITE_OWNER', resourceType: 'school', ip: _ip || undefined });
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
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
}
