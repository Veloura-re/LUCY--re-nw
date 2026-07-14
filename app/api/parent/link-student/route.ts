import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbParent = await requireRole(['PARENT']);
        const { studentCode, confirm } = await request.json();

        const student = await prisma.student.findUnique({
            where: { studentCode: studentCode.trim().toUpperCase() },
            include: {
                grade: true,
                school: true
            }
        });

        if (!student) {
            return NextResponse.json({ error: 'Invalid Student Code' }, { status: 404 });
        }

        // 1. Verification Mode: Just return student details (masked if needed)
        if (!confirm) {
            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'LINK_PARENT', resourceType: 'parent_link', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({
                success: true,
                student: {
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    schoolName: student.school.name, // Show school name for trust
                    gradeLevel: student.grade?.level     // Show grade for confirmation
                }
            });
        }

        // 2. Linking Mode: Create the relationship
        const link = await prisma.parentStudentLink.create({
            data: {
                parentId: dbParent.id,
                studentId: student.id,
                pairingMethod: 'CODE',
                verifiedAt: new Date()
            }
        });

        // 3. Ensure parent is linked to the school if not already
        if (!dbParent.schoolId) {
            await prisma.user.update({
                where: { id: dbParent.id },
                data: { schoolId: student.schoolId }
            });
        }

        return NextResponse.json({ success: true, link });

    } catch (e: any) {
        if (e.code === 'P2002') return NextResponse.json({ error: 'You are already linked to this student.' }, { status: 400 });
        return handleApiError(e);
    }
}
