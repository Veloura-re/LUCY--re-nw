import React from 'react';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { AdminShell } from '@/components/admin-shell';
import { prisma } from '@/lib/prisma';
import { SuperadminDashboardClient } from '@/components/superadmin-dashboard-client';

export default async function SuperadminPage() {
    const admin = await protectAdminPage([AdminRole.SUPERADMIN], '/superadmin');

    const [admins, schoolsCount, studentsCount, teachersCount, totalAuditCount] = await Promise.all([
        prisma.adminUser.findMany({
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                totpEnabled: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { sessions: true, auditLogs: true },
                },
            },
        }),
        prisma.school.count(),
        prisma.student.count(),
        prisma.user.count({ where: { role: { in: ['TEACHER', 'HOMEROOM'] } } }),
        prisma.adminAuditLog.count(),
    ]);

    return (
        <AdminShell admin={admin}>
            <div className="space-y-4">
                <div>
                    <h1 className="text-xl font-bold font-mono text-zinc-100">
                        SUPERADMIN COMMAND CENTER // ROOT GOVERNANCE
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                        Full Platform Authority. Highest Security Clearance Level.
                    </p>
                </div>

                <SuperadminDashboardClient
                    initialAdmins={admins}
                    metrics={{
                        schoolsCount,
                        studentsCount,
                        teachersCount,
                        totalAuditCount,
                    }}
                />
            </div>
        </AdminShell>
    );
}
