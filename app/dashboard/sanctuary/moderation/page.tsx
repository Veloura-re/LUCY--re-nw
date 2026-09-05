import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/security';

export default async function SanctuaryModerationPage() {
    const user = await requireAuth();
    if (user.role === 'SUPERADMIN') {
        redirect('/admin/sanctuary');
    }
    redirect('/dashboard');
}
