import React from 'react';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { AdminShell } from '@/components/admin-shell';
import { prisma } from '@/lib/prisma';
import { SecurityDashboardClient } from '@/components/security-dashboard-client';

export default async function SecurityAdminPage() {
    const admin = await protectAdminPage([AdminRole.SECURITY], '/security');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [auditLogs, activeSessions, lockedAdmins] = await Promise.all([
        prisma.adminAuditLog.findMany({
            take: 75,
            orderBy: { createdAt: 'desc' },
            include: {
                admin: { select: { id: true, name: true, email: true, role: true } },
            },
        }),
        prisma.adminSession.findMany({
            where: {
                isRevoked: false,
                lastActiveAt: { gte: thirtyMinutesAgo },
            },
            orderBy: { lastActiveAt: 'desc' },
            include: {
                admin: { select: { id: true, name: true, email: true, role: true } },
            },
        }),
        prisma.adminUser.findMany({
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
        }),
    ]);

    return (
        <AdminShell admin={admin}>
            <div className="space-y-4">
                <div>
                    <h1 className="text-xl font-bold font-mono text-zinc-100">
                        SECURITY OPERATIONS & ACCESS GOVERNANCE
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                        Restricted Access: Security Administrator Clearance
                    </p>
                </div>

                <SecurityDashboardClient
                    initialActiveSessions={activeSessions}
                    initialAuditLogs={auditLogs}
                    initialLockedAdmins={lockedAdmins}
                />
            </div>
        </AdminShell>
    );
}
