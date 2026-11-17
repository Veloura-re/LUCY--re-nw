import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-auth';
import { hashPassword } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.SUPERADMIN]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    // 1. All Admin Accounts
    const admins = await prisma.adminUser.findMany({
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
    });

    // 2. High-level platform telemetry
    const [schoolsCount, studentsCount, teachersCount, totalAuditCount] = await Promise.all([
        prisma.school.count(),
        prisma.student.count(),
        prisma.user.count({ where: { role: { in: ['TEACHER', 'HOMEROOM'] } } }),
        prisma.adminAuditLog.count(),
    ]);

    await logAdminAction({
        adminId: admin.id,
        action: 'SUPERADMIN_DASHBOARD_VIEWED',
        targetResource: 'SuperadminCommandCenter',
        ipAddress: ip,
        userAgent,
    });

    return NextResponse.json({
        admins,
        metrics: {
            schoolsCount,
            studentsCount,
            teachersCount,
            totalAuditCount,
        },
    });
}

const SuperadminActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('CREATE_ADMIN'),
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(10, 'Password must be at least 10 characters'),
        role: z.enum([AdminRole.FINANCE, AdminRole.SECURITY, AdminRole.DEVELOPER, AdminRole.SUPPORT]),
    }),
    z.object({
        action: z.literal('UPDATE_ROLE'),
        adminId: z.string().uuid(),
        role: z.enum([AdminRole.FINANCE, AdminRole.SECURITY, AdminRole.DEVELOPER, AdminRole.SUPPORT]),
    }),
    z.object({
        action: z.literal('DELETE_ADMIN'),
        adminId: z.string().uuid(),
    }),
]);

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.SUPERADMIN]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parsed = SuperadminActionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid operation parameters.', details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.action === 'CREATE_ADMIN') {
        const { name, email, password, role } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Enforce: only one SUPERADMIN can exist
        if ((role as string) === 'SUPERADMIN') {
            return NextResponse.json({ error: 'Invariant violation: Only one superadmin account is permitted.' }, { status: 400 });
        }

        const existing = await prisma.adminUser.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return NextResponse.json({ error: 'An administrator with this email already exists.' }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        const created = await prisma.adminUser.create({
            data: {
                name,
                email: normalizedEmail,
                passwordHash,
                role,
            },
            select: { id: true, name: true, email: true, role: true },
        });

        await logAdminAction({
            adminId: admin.id,
            action: 'ADMIN_USER_CREATED',
            targetResource: 'AdminUser',
            targetId: created.id,
            ipAddress: ip,
            userAgent,
            metadata: { createdRole: role, email: normalizedEmail },
        });

        return NextResponse.json({ success: true, admin: created });
    }

    if (parsed.data.action === 'UPDATE_ROLE') {
        const { adminId, role } = parsed.data;

        const target = await prisma.adminUser.findUnique({ where: { id: adminId } });
        if (!target) return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });

        if (target.role === AdminRole.SUPERADMIN) {
            return NextResponse.json({ error: 'Cannot reassign or alter the superadmin role.' }, { status: 403 });
        }

        const updated = await prisma.adminUser.update({
            where: { id: adminId },
            data: { role },
            select: { id: true, name: true, email: true, role: true },
        });

        await logAdminAction({
            adminId: admin.id,
            action: 'ADMIN_ROLE_UPDATED',
            targetResource: 'AdminUser',
            targetId: adminId,
            ipAddress: ip,
            userAgent,
            metadata: { previousRole: target.role, newRole: role },
        });

        return NextResponse.json({ success: true, admin: updated });
    }

    if (parsed.data.action === 'DELETE_ADMIN') {
        const { adminId } = parsed.data;

        const target = await prisma.adminUser.findUnique({ where: { id: adminId } });
        if (!target) return NextResponse.json({ error: 'Admin user not found.' }, { status: 404 });

        if (target.role === AdminRole.SUPERADMIN) {
            return NextResponse.json({ error: 'The root superadmin cannot be deleted.' }, { status: 403 });
        }

        await prisma.adminUser.delete({ where: { id: adminId } });

        await logAdminAction({
            adminId: admin.id,
            action: 'ADMIN_USER_DELETED',
            targetResource: 'AdminUser',
            targetId: adminId,
            ipAddress: ip,
            userAgent,
            metadata: { deletedEmail: target.email, deletedRole: target.role },
        });

        return NextResponse.json({ success: true, message: 'Admin account removed.' });
    }

    return NextResponse.json({ error: 'Unhandled action.' }, { status: 400 });
}
