import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireAuth();

        const authorizations = await (prisma as any).absenceAuthorization.findMany({
            where: { requestorId: dbUser.id },
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ authorizations });
    } catch (e: any) {
        console.error(e);
        console.error(`[GET /api/user/authorizations] Error: ${e.message}`, e.stack);

        return NextResponse.json({ error: 'Failed to fetch authorizations', message: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireAuth();
        const body = await request.json() as any;
        const { studentId, startDate, endDate, reason, isStaffLeave } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Dates required' }, { status: 400 });
        }

        const data: any = {
            requestorId: dbUser.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            status: 'PENDING'
        };

        if (isStaffLeave) {
            data.userId = dbUser.id;
        } else if (studentId) {
            // Role-based validation for target student
            if (dbUser.role === 'PARENT') {
                const link = await prisma.parentStudentLink.findFirst({
                    where: { parentId: dbUser.id, studentId: studentId }
                });
                if (!link) {
                    return NextResponse.json({ error: 'Forbidden: Identity not linked to your family axis' }, { status: 403 });
                }
            }

            data.studentId = studentId;
        } else {
            // Check if current user is a student requesting for self
            const student = await prisma.student.findUnique({ where: { userId: dbUser.id } });
            if (student) {
                data.studentId = student.id;
            } else {
                return NextResponse.json({ error: 'Target identity not found' }, { status: 400 });
            }
        }

        const authorization = await (prisma as any).absenceAuthorization.create({
            data
        });

        return NextResponse.json({ authorization });
    } catch (e: any) {
        console.error(e);
        console.error(`[POST /api/user/authorizations] Error: ${e.message}`, e.stack);

        return NextResponse.json({ error: 'Failed to create authorization', message: e.message }, { status: 500 });
    }
}
