import { redirect } from 'next/navigation';
import { AdminRole } from '@prisma/client';
import { protectAdminPage } from '@/lib/page-guard';
import { getDefaultRouteForRole } from '@/lib/rbac';

export default async function AdminRootPage() {
    const admin = await protectAdminPage(
        [
            AdminRole.SUPERADMIN,
            AdminRole.FINANCE,
            AdminRole.SECURITY,
            AdminRole.DEVELOPER,
            AdminRole.SUPPORT,
        ],
        '/'
    );

    redirect(getDefaultRouteForRole(admin.role));
}
