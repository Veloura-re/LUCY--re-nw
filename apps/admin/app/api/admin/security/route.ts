import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-auth';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.SECURITY]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    // 1. Recent Admin Audit Logs
    const auditLogs = await prisma.adminAuditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
            admin: { select: { id: true, name: true, email: true, role: true } },
        },
    });

    // 2. Active Admin Sessions (not revoked and within 30 min)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const activeSessions = await prisma.adminSession.findMany({
        where: {
            isRevoked: false,
            lastActiveAt: { gte: thirtyMinutesAgo },
        },
        orderBy: { lastActiveAt: 'desc' },
        include: {
            admin: { select: { id: true, name: true, email: true, role: true } },
        },
    });

    // 3. Locked or Suspicious Accounts
    const lockedAdmins = await prisma.adminUser.findMany({
        where: {
            OR: [
                { failedLoginAttempts: { gt: 0 } },
                { lockedUntil: { gt: new Date() } },
            ],
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            failedLoginAttempts: true,
            lockedUntil: true,
        },
    });

    await logAdminAction({
        adminId: admin.id,
        action: 'SECURITY_DASHBOARD_VIEWED',
        targetResource: 'SecurityCenter',
        ipAddress: ip,
        userAgent,
    });

    return NextResponse.json({
        auditLogs,
        activeSessions,
        lockedAdmins,
    });
}

const ActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('REVOKE_SESSION'),
        sessionId: z.string().uuid(),
    }),
    z.object({
        action: z.literal('UNLOCK_ACCOUNT'),
        adminId: z.string().uuid(),
    }),
]);

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.SECURITY]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid action payload.' }, { status: 400 });
    }

    if (parsed.data.action === 'REVOKE_SESSION') {
        const { sessionId } = parsed.data;
        await prisma.adminSession.update({
            where: { id: sessionId },
            data: { isRevoked: true },
        });

        await logAdminAction({
            adminId: admin.id,
            action: 'SESSION_FORCED_REVOCATION',
            targetResource: 'AdminSession',
            targetId: sessionId,
            ipAddress: ip,
            userAgent,
        });

        return NextResponse.json({ success: true, message: 'Session revoked successfully.' });
    }

    if (parsed.data.action === 'UNLOCK_ACCOUNT') {
        const { adminId } = parsed.data;
        await prisma.adminUser.update({
            where: { id: adminId },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        await logAdminAction({
            adminId: admin.id,
            action: 'ADMIN_ACCOUNT_UNLOCKED',
            targetResource: 'AdminUser',
            targetId: adminId,
            ipAddress: ip,
            userAgent,
        });

        return NextResponse.json({ success: true, message: 'Account unlocked successfully.' });
    }

    return NextResponse.json({ error: 'Unhandled action.' }, { status: 400 });
}
