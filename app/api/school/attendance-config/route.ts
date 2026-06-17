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
        const config = await request.json();

        const updated = await prisma.school.update({
            where: { id: dbUser.schoolId! },
            data: { attendanceConfig: config }
        });
        return NextResponse.json({ config: updated.attendanceConfig });
    } catch (e) {
        return handleApiError(e);
    }
}
