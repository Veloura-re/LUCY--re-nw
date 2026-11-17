import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, AdminAuthContext } from './auth';
import { isRoleAllowedForPath } from './rbac';
import { AdminRole } from '@prisma/client';

/**
 * Server Component gate enforcing authentication, 30-minute inactivity validity,
 * and role-based clearance before page rendering.
 */
export async function protectAdminPage(
    requiredRoles: AdminRole[],
    currentPath: string
): Promise<AdminAuthContext> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    const admin = await getAuthenticatedAdmin(raw);

    if (!admin) {
        redirect(`/login?from=${encodeURIComponent(currentPath)}`);
    }

    if (!isRoleAllowedForPath(admin.role, currentPath)) {
        redirect('/unauthorized');
    }

    return admin;
}
