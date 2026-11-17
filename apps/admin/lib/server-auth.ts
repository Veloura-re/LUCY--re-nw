import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@prisma/client';
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, AdminAuthContext } from './auth';
import { getValidatedClientIp } from './client-ip';

export async function requireAdmin(
    request: NextRequest,
    allowedRoles: AdminRole[]
): Promise<{ admin: AdminAuthContext; ip: string; userAgent: string | null } | NextResponse> {
    const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const admin = await getAuthenticatedAdmin(rawCookie);

    if (!admin) {
        return NextResponse.json(
            { error: 'Unauthorized: Session missing, revoked, or expired after 30 minutes of inactivity.' },
            { status: 401 }
        );
    }

    if (admin.role !== AdminRole.SUPERADMIN && !allowedRoles.includes(admin.role)) {
        return NextResponse.json(
            { error: `Forbidden: Admin role '${admin.role}' does not have clearance for this operation.` },
            { status: 403 }
        );
    }

    return {
        admin,
        ip: getValidatedClientIp(request),
        userAgent: request.headers.get('user-agent'),
    };
}
