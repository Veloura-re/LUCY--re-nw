import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const status = searchParams.get('status') as any;

        const authorizations = await (prisma as any).absenceAuthorization.findMany({
            where: {
                OR: [
                    { student: { schoolId: dbUser.schoolId! } },
                    { user: { schoolId: dbUser.schoolId! } },
                    { requestor: { schoolId: dbUser.schoolId! } }
                ],
                ...(studentId ? { studentId } : {}),
                ...(status ? { status } : {}),
            },
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentCode: true }
                },
                user: {
                    select: { name: true, email: true, role: true }
                },
                requestor: {
                    select: { name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ authorizations });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        // Only Staff can approve
        const dbUser = await requireRole(['PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN']);

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID and Status required' }, { status: 400 });
        }

        const authorization = await (prisma as any).absenceAuthorization.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ authorization });
    } catch (e) {
        return handleApiError(e);
    }
}
