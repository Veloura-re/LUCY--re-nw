import { prisma } from './prisma';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/** Extract client IP from a NextRequest / standard Request header chain */
export function getIp(req?: Request | null): string | undefined {
    if (!req) return undefined;
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('cf-connecting-ip') ||
        undefined
    );
}


export async function logActivity({
    userId,
    schoolId,
    action,
    resourceType,
    resourceId,
    level = 'INFO',
    statusCode,
    path,
    before,
    after,
    ip,
    userAgent,
}: {
    userId: string;
    schoolId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    level?: LogLevel;
    statusCode?: number;
    path?: string;
    before?: any;
    after?: any;
    ip?: string;
    userAgent?: string;
}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                schoolId,
                action,
                resourceType,
                resourceId,
                level,
                statusCode,
                path,
                before: before ? JSON.parse(JSON.stringify(before)) : undefined,
                after: after ? JSON.parse(JSON.stringify(after)) : undefined,
                ip,
                userAgent,
            }
        });
    } catch (e) {
        // Non-blocking — never crash a route over audit logging
        console.error('[audit] Failed to log activity:', e);
    }
}

export async function logError({
    schoolId,
    userId,
    type,
    message,
    stack,
    path,
    statusCode,
    ip,
    userAgent,
    metadata,
    level = 'ERROR',
}: {
    schoolId?: string;
    userId?: string;
    type: 'ui_crash' | 'api_error' | 'route_404' | 'auth_failure' | 'unhandled_rejection' | 'network_error';
    message: string;
    stack?: string;
    path?: string;
    statusCode?: number;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    level?: LogLevel;
}) {
    try {
        await prisma.errorLog.create({
            data: {
                schoolId,
                userId,
                type,
                message: message.slice(0, 2000), // cap length
                stack: stack?.slice(0, 5000),
                path,
                statusCode,
                ip,
                userAgent,
                metadata,
                level,
            }
        });
    } catch (e) {
        console.error('[audit] Failed to log error:', e);
    }
}
