import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError, isValidEmail } from '@/lib/security';
import { rateLimitShared } from '@/lib/rate-limit';
import { sendInviteEmail } from '@/lib/email';
import { getIp, logActivity } from '@/lib/audit';
import { INVITABLE_STAFF_ROLE_FILTER, isInvitableStaffRole } from '@/lib/staff-roles';

/** Directors (principal or owner) manage their own school's accountants and recorders. */
const DIRECTOR_ROLES = ['OWNER', 'PRINCIPAL'] as const;

export async function GET() {
    try {
        const director = await requireRole([...DIRECTOR_ROLES]);
        const schoolId = director.schoolId!;

        const [staff, invites] = await Promise.all([
            prisma.user.findMany({
                where: { schoolId, role: INVITABLE_STAFF_ROLE_FILTER },
                select: { id: true, name: true, email: true, photoUrl: true, role: true, verified: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.inviteToken.findMany({
                where: { schoolId, role: INVITABLE_STAFF_ROLE_FILTER, usedAt: null },
                select: { id: true, email: true, role: true, token: true, createdAt: true, expiresAt: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return NextResponse.json({ staff, invites });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const limited = await rateLimitShared(request, 'school/staff-roles/invite', 20);
        if (limited) return limited;

        const director = await requireRole([...DIRECTOR_ROLES]);
        const schoolId = director.schoolId!;

        const body = (await request.json().catch(() => ({}))) as { email?: unknown; role?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!isValidEmail(email)) return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
        if (!isInvitableStaffRole(body.role)) return NextResponse.json({ error: 'Choose Accountant or Recorder' }, { status: 400 });
        const role = body.role;

        const existingUser = await prisma.user.findUnique({ where: { email }, select: { schoolId: true, verified: true } });
        if (existingUser?.schoolId && existingUser.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Email is already registered to another institution.' }, { status: 400 });
        }
        if (existingUser?.schoolId === schoolId && existingUser.verified) {
            return NextResponse.json({ error: 'This person is already a member of your school.' }, { status: 400 });
        }

        const token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        // A newer invitation replaces an unused one for the same address, in this school only. The lock
        // makes simultaneous requests take turns, so exactly one invitation stays live.
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`invite:${schoolId}:${email}`}))`;
            await tx.inviteToken.deleteMany({ where: { email, schoolId, usedAt: null } });
            await tx.inviteToken.create({ data: { token, email, role, schoolId, expiresAt } });
        });

        const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
        const emailResult = (await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', token, role, schoolId)) as {
            success?: boolean; skipped?: boolean; simulated?: boolean; error?: string;
        };

        await logActivity({
            userId: director.id,
            schoolId,
            action: 'INVITE_STAFF_ROLE',
            resourceType: 'invite',
            ip: getIp(request),
            after: { email, role },
        });

        return NextResponse.json({
            inviteToken: token,
            inviteUrl,
            emailSent: Boolean(emailResult.success && !emailResult.skipped),
            emailError: emailResult.error || null,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/** Revokes an unused invitation. Removing an active member goes through /api/school/teachers/delete. */
export async function DELETE(request: Request) {
    try {
        const director = await requireRole([...DIRECTOR_ROLES]);
        const schoolId = director.schoolId!;
        const inviteId = new URL(request.url).searchParams.get('inviteId');
        if (!inviteId) return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });

        const revoked = await prisma.inviteToken.deleteMany({
            where: { id: inviteId, schoolId, role: INVITABLE_STAFF_ROLE_FILTER, usedAt: null },
        });
        if (revoked.count === 0) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

        await logActivity({
            userId: director.id,
            schoolId,
            action: 'REVOKE_STAFF_INVITE',
            resourceType: 'invite',
            resourceId: inviteId,
            ip: getIp(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
