import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { searchParams } = new URL(request.url);
        const dateQuery = searchParams.get('date');
        const targetDate = dateQuery ? new Date(dateQuery) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // 1. Student Attendance Statistics
        const studentRecords = await prisma.attendanceRecord.findMany({
            where: {
                student: {
                    schoolId: dbUser.schoolId!
                },
                date: {
                    gte: targetDate,
                    lt: nextDay
                }
            },
            select: { status: true }
        });

        const presentStudents = studentRecords.filter(r => r.status === 'PRESENT').length;
        const absentStudents = studentRecords.filter(r => r.status === 'ABSENT').length;
        const lateStudents = studentRecords.filter(r => r.status === 'LATE').length;
        const excusedStudents = studentRecords.filter(r => r.status === 'EXCUSED').length;

        // 2. Teacher Compliance
        const teachers = await prisma.user.findMany({
            where: {
                schoolId: dbUser.schoolId!,
                role: { in: ['TEACHER', 'HOMEROOM'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                attendanceRecords: {
                    where: {
                        date: {
                            gte: targetDate,
                            lt: nextDay
                        }
                    },
                    take: 1
                }
            }
        });

        const teacherCompliance = teachers.map(teacher => ({
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            hasSubmittedAttendance: teacher.attendanceRecords.length > 0
        }));

        // 3. Staff Presence Count (Today/Target Date)
        const staffRecords = await prisma.staffAttendanceRecord.count({
            where: {
                user: { schoolId: dbUser.schoolId! },
                date: { gte: targetDate, lt: nextDay },
                status: 'PRESENT'
            }
        });

        const totalStaff = await prisma.user.count({
            where: { schoolId: dbUser.schoolId!, role: { in: ['TEACHER', 'HOMEROOM'] } }
        });

        return NextResponse.json({
            stats: {
                present: presentStudents,
                absent: absentStudents,
                late: lateStudents,
                excused: excusedStudents,
                total: studentRecords.length,
                staffPresent: staffRecords,
                staffTotal: totalStaff
            },
            teacherCompliance
        });

    } catch (e) {
        return handleApiError(e);
    }
}
