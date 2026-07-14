import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PARENT']);

        // Find all linked students
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: dbUser.id },
            select: { studentId: true }
        });
        const studentIds = links.map(l => l.studentId);

        const authorizations = await (prisma as any).absenceAuthorization.findMany({
            where: {
                OR: [
                    { requestorId: dbUser.id },
                    { studentId: { in: studentIds } }
                ]
            },
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ authorizations });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['PARENT']);
        const body = await request.json();
        const { studentId, startDate, endDate, reason } = body;

        if (!studentId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify parent is linked to student
        const link = await prisma.parentStudentLink.findFirst({
            where: { parentId: dbUser.id, studentId }
        });

        if (!link) {
            return NextResponse.json({ error: 'Forbidden: Student not linked to this account' }, { status: 403 });
        }

        const authorization = await (prisma as any).absenceAuthorization.create({
            data: {
                studentId,
                requestorId: dbUser.id,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'PENDING'
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'authorization', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ authorization });
    } catch (e) {
        return handleApiError(e);
    }
}
