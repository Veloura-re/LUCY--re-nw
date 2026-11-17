import { prisma } from './prisma';

export interface AuditLogParams {
    adminId?: string | null;
    action: string;
    targetResource: string;
    targetId?: string | null;
    ipAddress: string;
    userAgent?: string | null;
    metadata?: Record<string, any> | null;
}

/**
 * Persists an immutable administrative audit log entry.
 * Captures who, what, when, IP address, and operation context.
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: params.adminId || null,
                action: params.action,
                targetResource: params.targetResource,
                targetId: params.targetId || null,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent ? params.userAgent.slice(0, 512) : null,
                metadata: params.metadata ? (params.metadata as any) : undefined,
                createdAt: new Date(),
            },
        });
    } catch (error) {
        console.error('[Admin Audit Log Error]', error);
    }
}
