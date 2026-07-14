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

        const notes = await prisma.internalNote.findMany({
            where: { studentId },
            include: {
                author: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ notes });
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

        const { content } = await request.json();

        const note = await prisma.internalNote.create({
            data: {
                studentId,
                authorId: user.id,
                content
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'student_note', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ note });
    } catch (e) {
        return handleApiError(e);
    }
}
