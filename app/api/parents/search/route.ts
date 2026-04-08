import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const staffUser = await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'HOMEROOM']);

        const { searchParams } = new URL(request.url);
        const studentCode = searchParams.get('studentCode');

        if (!studentCode) {
            return NextResponse.json({ error: 'Student code is required' }, { status: 400 });
        }

        // Find the student and their linked parents
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { studentCode: studentCode.toUpperCase() },
                    { firstName: { contains: studentCode, mode: 'insensitive' } },
                    { lastName: { contains: studentCode, mode: 'insensitive' } },
                    {
                        AND: [
                            { firstName: { contains: studentCode.split(' ')[0], mode: 'insensitive' } },
                            { lastName: { contains: studentCode.split(' ')[1] || '', mode: 'insensitive' } }
                        ]
                    }
                ],
                // If not SUPERADMIN, restrict to the same school
                ...(staffUser.role !== 'SUPERADMIN' ? { schoolId: staffUser.schoolId! } : {})
            },
            include: {
                parentLinks: {
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                                createdAt: true
                            }
                        }
                    }
                },
                class: true,
                grade: true
            }
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({
            student: {
                name: `${student.firstName} ${student.lastName}`,
                code: student.studentCode,
                className: (student as any).class?.name,
                gradeName: (student as any).grade?.name
            },
            parents: (student as any).parentLinks.map((link: any) => link.parent)
        });

    } catch (error) {
        return handleApiError(error);
    }
}
