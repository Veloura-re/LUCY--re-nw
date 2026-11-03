import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

import { logActivity } from '@/lib/audit';
import { dobMatches, INVALID_CODE_OR_DOB } from '@/lib/student-code';
export async function POST(request: Request) {
    try {
        const dbParent = await requireRole(['PARENT']);
        const body = await request.json() as any;
        const { studentCode, dob } = body || {};

        if (!studentCode) {
            return NextResponse.json({ error: 'Student code is required' }, { status: 400 });
        }

        // 1. Find the student by code
        const student = await prisma.student.findUnique({
            where: { studentCode: studentCode.toUpperCase() },
            include: { school: true }
        });

        if (!student || !dobMatches(student.dob, dob)) {
            return NextResponse.json({ error: INVALID_CODE_OR_DOB }, { status: 404 });
        }

        // 3. Check if link already exists
        const existingLink = await prisma.parentStudentLink.findUnique({
            where: {
                parentId_studentId: {
                    parentId: dbParent.id,
                    studentId: student.id
                }
            }
        });

        if (existingLink) {
            return NextResponse.json({ message: 'Student is already linked to this account', alreadyLinked: true }, { status: 200 });
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
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbParent?.id;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'PAIR_PARENT', resourceType: 'parent_pair', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, studentName: `${student.firstName} ${student.lastName}` });

    } catch (e) {
        return handleApiError(e);
    }
}
