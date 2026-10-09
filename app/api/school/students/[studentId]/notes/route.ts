import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireStudentAccess } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
    try {
        const { studentId } = await params;
        const { student } = await requireStudentAccess(studentId);

        const notes = await prisma.internalNote.findMany({
            where: { studentId: student.id },
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
        const { user, student } = await requireStudentAccess(studentId);

        const { content }: any = await request.json().catch(() => ({}));

        if (typeof content !== 'string' || !content.trim() || content.length > 5000) {
            return NextResponse.json({ error: 'Note content is required (max 5000 characters)' }, { status: 400 });
        }

        const note = await prisma.internalNote.create({
            data: {
                studentId: student.id,
                authorId: user.id,
                content: content.trim()
            }
        });

        await logActivity({
            userId: user.id,
            schoolId: student.schoolId,
            action: 'CREATE',
            resourceType: 'student_note',
            resourceId: note.id,
            ip: getIp(request)
        });

        return NextResponse.json({ note });
    } catch (e) {
        return handleApiError(e);
    }
}
