import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

const DEFAULT_ATTENDANCE_CONFIG = {
    type: 'PERIOD',
    lockAfterMinutes: 30,
    enableLateMarking: true,
    autoAbsentAfterMinutes: 45
};

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const school = await prisma.school.findUnique({
            where: { id: dbUser.schoolId! },
            select: { attendanceConfig: true }
        });

        const rawConfig = school?.attendanceConfig;
        const config = rawConfig && typeof rawConfig === 'object'
            ? { ...DEFAULT_ATTENDANCE_CONFIG, ...(rawConfig as Record<string, any>) }
            : DEFAULT_ATTENDANCE_CONFIG;

        return NextResponse.json({ config });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const raw = (await request.json().catch(() => ({}))) as any;

        const config = {
            type: raw.type === 'DAILY' ? 'DAILY' : 'PERIOD',
            lockAfterMinutes: typeof raw.lockAfterMinutes === 'number' && !isNaN(raw.lockAfterMinutes)
                ? Math.max(0, raw.lockAfterMinutes)
                : 30,
            enableLateMarking: typeof raw.enableLateMarking === 'boolean'
                ? raw.enableLateMarking
                : true,
            autoAbsentAfterMinutes: typeof raw.autoAbsentAfterMinutes === 'number' && !isNaN(raw.autoAbsentAfterMinutes)
                ? Math.max(0, raw.autoAbsentAfterMinutes)
                : 45
        };

        const updated = await prisma.school.update({
            where: { id: dbUser.schoolId! },
            data: { attendanceConfig: config }
        });

        // Invalidate school attendance and class caches
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, dbUser.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } catch { /* non-blocking */ }

        // Multi-Tenant Audit logging invariant
        try {
            const clientIp = getIp(request);
            await logActivity({
                userId: dbUser.id,
                schoolId: dbUser.schoolId!,
                action: 'UPDATE_ATTENDANCE_CONFIG',
                resourceType: 'attendance_config',
                resourceId: dbUser.schoolId!,
                ip: clientIp,
                after: config
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ config: updated.attendanceConfig, success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
