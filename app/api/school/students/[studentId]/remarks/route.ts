import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireStudentAccess } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
    try {
        const { studentId } = await params;
        const { student } = await requireStudentAccess(studentId);

        const remarks = await prisma.studentRemark.findMany({
            where: { studentId: student.id },
            include: {
                teacher: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ remarks });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
    try {
        const { studentId } = await params;
        const { user, student } = await requireStudentAccess(studentId);

        const { content, term }: any = await request.json().catch(() => ({}));

        if (typeof content !== 'string' || !content.trim() || content.length > 5000) {
            return NextResponse.json({ error: 'Remark content is required (max 5000 characters)' }, { status: 400 });
        }

        let termId: string | undefined;
        if (term) {
            // The term must belong to the same school as the student
            const academicTerm = await prisma.academicTerm.findFirst({
                where: { id: String(term), schoolId: student.schoolId },
                select: { id: true }
            });
            if (!academicTerm) {
                return NextResponse.json({ error: 'Invalid term' }, { status: 400 });
            }
            termId = academicTerm.id;
        }

        const remark = await prisma.studentRemark.create({
            data: {
                studentId: student.id,
                teacherId: user.id,
                content: content.trim(),
                termId
            }
        });

        await logActivity({
            userId: user.id,
            schoolId: student.schoolId,
            action: 'CREATE',
            resourceType: 'student_remark',
            resourceId: remark.id,
            ip: getIp(request)
        });

        return NextResponse.json({ remark });
    } catch (e) {
        return handleApiError(e);
    }
}
