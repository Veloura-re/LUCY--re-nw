import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        // 0. Prefetch Class IDs to avoid Prisma deep relationship group-by issues
        const schoolClasses = await prisma.class.findMany({
            where: { grade: { schoolId: dbUser.schoolId!! } },
            select: { id: true }
        });
        const classIds = schoolClasses.map(c => c.id);

        // 1. Attendance Trends (Last 7 Days - Normalized)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            days.push(d);
        }

        const attendanceData = await Promise.all(days.map(async (day) => {
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);

            const counts = await (prisma.attendanceRecord as any).groupBy({
                by: ['status'],
                where: {
                    classId: { in: classIds },
                    date: {
                        gte: day,
                        lt: nextDay
                    }
                },
                _count: { id: true }
            }) as any[];

            const present = counts.find((c: any) => c.status === 'PRESENT' || c.status === 'LATE')?._count?.id || 0;
            const absent = counts.find((c: any) => c.status === 'ABSENT')?._count?.id || 0;
            const total = present + absent;

            return {
                date: day.toISOString(),
                percentage: total > 0 ? (present / total) * 100 : 100,
                total
            };
        }));

        // 2. Grade Distribution (Mean scores per subject)
        // Similar to above, prefetch subject IDs securely to avoid deep association issues
        const schoolSubjects = await prisma.subject.findMany({
            where: { schoolId: dbUser.schoolId! },
            select: { id: true, name: true }
        });
        const subjectIds = schoolSubjects.map(s => s.id);

        const gradeStats = await (prisma.gradeRecord as any).groupBy({
            by: ['subjectId'],
            where: {
                subjectId: { in: subjectIds }
            },
            _avg: { score: true },
            _count: { id: true }
        }) as any[];

        const performanceBySubject = gradeStats.map(s => ({
            name: schoolSubjects.find(sub => sub.id === s.subjectId)?.name || 'Unknown',
            avg: s._avg.score || 0,
            count: s._count.id
        }));

        // 4. Summary Metrics for Director Pulse
        const totalAttendance = await prisma.attendanceRecord.count({
            where: { class: { grade: { schoolId: dbUser.schoolId! } } }
        });
        const presentAttendance = await prisma.attendanceRecord.count({
            where: {
                class: { grade: { schoolId: dbUser.schoolId! } },
                status: { in: ['PRESENT', 'LATE'] }
            }
        });

        const totalExams = await prisma.exam.count({
            where: { class: { grade: { schoolId: dbUser.schoolId! } } }
        });
        const lockedExams = await prisma.exam.count({
            where: {
                class: { grade: { schoolId: dbUser.schoolId! } },
                isLocked: true
            }
        });

        const lastSevenDays = days[0];

        const recentEvents = await prisma.event.count({
            where: { schoolId: dbUser.schoolId!, eventDate: { gte: lastSevenDays } }
        });

        const studentCount = await prisma.student.count({
            where: { schoolId: dbUser.schoolId! }
        });
        const classCount = await prisma.class.count({
            where: { grade: { schoolId: dbUser.schoolId! } }
        });

        const summary = {
            avgAttendance: totalAttendance > 0 ? `${((presentAttendance / totalAttendance) * 100).toFixed(1)}%` : "100%",
            examCompletion: totalExams > 0 ? `${((lockedExams / totalExams) * 100).toFixed(0)}%` : "0%",
            totalExams,
            lockedExams,
            recentEvents,
            studentCount,
            classCount,
            activeNodes: studentCount + classCount,
            staffPresence: {
                present: await prisma.staffAttendanceRecord.count({
                    where: { user: { schoolId: dbUser.schoolId! }, date: { gte: days[days.length - 1] }, status: 'PRESENT' }
                }),
                total: await prisma.user.count({
                    where: { schoolId: dbUser.schoolId!, role: { in: ['TEACHER', 'HOMEROOM'] } }
                }),
                staffedClasses: await prisma.class.count({
                    where: {
                        grade: { schoolId: dbUser.schoolId! },
                        homeroomTeacher: {
                            staffAttendance: {
                                some: {
                                    date: { gte: days[days.length - 1] },
                                    status: 'PRESENT'
                                }
                            }
                        }
                    }
                })
            }
        };

        // 3. Teacher Workload (Assignments count)
        const teacherWorkload = await prisma.user.findMany({
            where: { schoolId: dbUser.schoolId!, role: { in: ['TEACHER', 'HOMEROOM'] } },
            select: {
                name: true,
                _count: {
                    select: { teacherAssignments: true, timetable: true }
                }
            }
        });

        return NextResponse.json({
            summary,
            attendance: attendanceData,
            performanceBySubject,
            teacherWorkload: teacherWorkload.map(t => ({
                name: t.name,
                assignments: t._count.teacherAssignments,
                periods: t._count.timetable
            }))
        });

    } catch (e) {
        return handleApiError(e);
    }
}
