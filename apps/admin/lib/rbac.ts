import { AdminRole } from '@prisma/client';

export const ROLE_ROUTE_PERMISSIONS: Record<string, AdminRole[]> = {
    '/finance': [AdminRole.FINANCE, AdminRole.SUPERADMIN],
    '/security': [AdminRole.SECURITY, AdminRole.SUPERADMIN],
    '/logs': [AdminRole.DEVELOPER, AdminRole.SUPERADMIN],
    '/support': [AdminRole.SUPPORT, AdminRole.SUPERADMIN],
    '/superadmin': [AdminRole.SUPERADMIN],
};

export function getDefaultRouteForRole(role: AdminRole): string {
    switch (role) {
        case AdminRole.SUPERADMIN:
            return '/superadmin';
        case AdminRole.FINANCE:
            return '/finance';
        case AdminRole.SECURITY:
            return '/security';
        case AdminRole.DEVELOPER:
            return '/logs';
        case AdminRole.SUPPORT:
            return '/support';
        default:
            return '/unauthorized';
    }
}

export function isRoleAllowedForPath(role: AdminRole, pathname: string): boolean {
    if (role === AdminRole.SUPERADMIN) {
        return true;
    }

    for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTE_PERMISSIONS)) {
        if (pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)) {
            return allowedRoles.includes(role);
        }
    }

    // Default: allow non-role-restricted common routes like /unauthorized
    return true;
}
