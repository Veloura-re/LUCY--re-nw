import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const school = await prisma.school.findUnique({
            where: { id: dbUser.schoolId! },
            select: { attendanceConfig: true }
        });

        return NextResponse.json({ config: school?.attendanceConfig });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const config = (await request.json()) as any;

        const updated = await prisma.school.update({
            where: { id: dbUser.schoolId! },
            data: { attendanceConfig: config }
        });
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'attendance', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ config: updated.attendanceConfig });
    } catch (e) {
        return handleApiError(e);
    }
}
