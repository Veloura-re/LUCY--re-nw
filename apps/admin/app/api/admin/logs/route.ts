import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server-auth';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request, [AdminRole.DEVELOPER]);
    if (auth instanceof NextResponse) return auth;

    const { admin, ip, userAgent } = auth;

    // 1. Health Probe
    const dbStartTime = Date.now();
    let dbStatus = 'HEALTHY';
    let dbLatencyMs = 0;
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStartTime;
    } catch {
        dbStatus = 'DEGRADED';
        dbLatencyMs = Date.now() - dbStartTime;
    }

    // 2. Fetch system error logs from InternalNote/AuditLog
    const errorLogs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { action: { contains: 'ERROR', mode: 'insensitive' } },
                { action: { contains: 'FAIL', mode: 'insensitive' } },
                { action: { contains: 'TIMEOUT', mode: 'insensitive' } },
            ],
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { email: true, name: true, role: true } },
            school: { select: { name: true } },
        },
    });

    const memoryUsage = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null;

    const systemHealth = {
        database: {
            status: dbStatus,
            latencyMs: dbLatencyMs,
        },
        process: {
            uptime: typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime()) : 0,
            memoryMb: memoryUsage ? Math.round(memoryUsage.heapUsed / 1024 / 1024) : 0,
            nodeVersion: process.version,
        },
        environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV || 'local',
            gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
        },
    };

    await logAdminAction({
        adminId: admin.id,
        action: 'DEVELOPER_SYSTEM_HEALTH_VIEWED',
        targetResource: 'SystemTelemetry',
        ipAddress: ip,
        userAgent,
    });

    return NextResponse.json({
        health: systemHealth,
        errorLogs,
    });
}
