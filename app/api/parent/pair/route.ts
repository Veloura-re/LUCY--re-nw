import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbParent = await requireRole(['PARENT']);
        const { studentCode } = await request.json();

        if (!studentCode) {
            return NextResponse.json({ error: 'Student code is required' }, { status: 400 });
        }

        // 1. Find the student by code
        const student = await prisma.student.findUnique({
            where: { studentCode: studentCode.toUpperCase() },
            include: { school: true }
        });

        if (!student) {
            return NextResponse.json({ error: 'Invalid student code' }, { status: 404 });
        }

        // 3. Check if link already exists
        const existingLink = await prisma.parentStudentLink.findFirst({
            where: {
                parentId: dbParent.id,
                studentId: student.id
            }
        });

        if (existingLink) {
            return NextResponse.json({ error: 'Student already linked to this account' }, { status: 400 });
        }

        // 4. Create the link
        await prisma.parentStudentLink.create({
            data: {
                parentId: dbParent.id,
                studentId: student.id,
                pairingMethod: 'CODE',
                verifiedAt: new Date()
            }
        });

        // 5. Ensure parent is linked to the school if not already
        if (!dbParent.schoolId) {
            await prisma.user.update({
                where: { id: dbParent.id },
                data: { schoolId: student.schoolId }
            });
        }

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'PAIR_PARENT', resourceType: 'parent_pair', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, studentName: `${student.firstName} ${student.lastName}` });

    } catch (e) {
        return handleApiError(e);
    }
}
