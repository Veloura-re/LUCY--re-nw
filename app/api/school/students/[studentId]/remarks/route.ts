import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireHomeroomAccess } from '@/lib/security';

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
    try {
        const { studentId } = await params;
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { classId: true }
        });

        if (student?.classId) {
            await requireHomeroomAccess(student.classId);
        } else {
            await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        }

        const remarks = await prisma.studentRemark.findMany({
            where: { studentId },
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
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { classId: true }
        });

        const user = student?.classId
            ? await requireHomeroomAccess(student.classId)
            : await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { content, term } = await request.json();

        const remark = await prisma.studentRemark.create({
            data: {
                studentId,
                teacherId: user.id,
                content,
                termId: term || undefined   // term is AcademicTerm FK (termId), not a string field
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'student_remark', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ remark });
    } catch (e) {
        return handleApiError(e);
    }
}
