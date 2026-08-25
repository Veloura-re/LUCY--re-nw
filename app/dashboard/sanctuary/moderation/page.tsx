import { requireRole } from '@/lib/security';
import SanctuaryModerationClient from '@/components/dashboard/sanctuary-moderation-client';

export const metadata = {
    title: 'Sanctuary Moderation & Safety Center | LUCY OS',
    description: 'Real-time anti-doxxing, PII intercept telemetry, and student safety moderation console.'
};

export default async function SanctuaryModerationPage() {
    const user = await requireRole([
        'SUPERADMIN',
        'OWNER',
        'PRINCIPAL',
        'TEACHER',
        'HOMEROOM'
    ]);

    return (
        <div className="space-y-6">
            <SanctuaryModerationClient 
                userRole={user.role} 
                userSchoolId={user.schoolId || ''} 
            />
        </div>
    );
}
