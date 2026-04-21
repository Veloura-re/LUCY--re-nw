import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
    try {
        const user = await requireRole(['SUPERADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT', 'STUDENT']);
        const { studentId } = await params;

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                class: {
                    include: {
                        grade: true
                    }
                },
                school: true,
                parentLinks: {
                    include: {
                        parent: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // [SECURITY] Tenant Isolation & Self-Access
        if (user.role === 'STUDENT') {
            if (student.userId !== user.id) {
                return NextResponse.json({ error: 'Access denied: You can only view your own report card' }, { status: 403 });
            }
        } else if (user.role !== 'SUPERADMIN' && student.schoolId !== user.schoolId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch all grades for this student
        const grades = await prisma.gradeRecord.findMany({
            where: { studentId },
            include: {
                subject: true,
                exam: true
            },
            orderBy: { exam: { availableFrom: 'asc' } }
        });

        // Fetch attendance
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: { studentId },
            orderBy: { date: 'desc' },
            take: 30
        });

        // For counts, we need the full list (or use prisma.count but this is simpler for now given existing logic)
        const allAttendance = await prisma.attendanceRecord.findMany({
            where: { studentId }
        });

        // Fetch remarks
        const remarks = await prisma.studentRemark.findMany({
            where: { studentId },
            include: { teacher: true },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch Homework / Assignments
        const assignments = await prisma.assignmentSubmission.findMany({
            where: { studentId },
            include: {
                assignment: {
                    select: {
                        id: true,
                        title: true,
                        maxPoints: true,
                        subject: { select: { name: true } }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        return NextResponse.json({
            student,
            grades,
            assignments,
            attendance: {
                total: allAttendance.length,
                present: allAttendance.filter(a => a.status === 'PRESENT').length,
                late: allAttendance.filter(a => a.status === 'LATE').length,
                absent: allAttendance.filter(a => a.status === 'ABSENT').length,
                history: attendanceRecords
            },
            remarks,
            internalNotes
        });

    } catch (e) {
        return handleApiError(e);
    }
}
