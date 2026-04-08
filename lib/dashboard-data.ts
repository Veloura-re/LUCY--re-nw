import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

// Refactor 1: getFamilyChildren
const _getFamilyChildren = async (userId: string) => {
    // We only fetch recent attendance (last 30 days) not all 5 years
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const links = await prisma.parentStudentLink.findMany({
        where: { parentId: userId },
        include: {
            student: {
                include: {
                    grade: true,
                    school: true,
                    class: {
                        include: {
                            homeroomTeacher: {
                                select: { id: true, name: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (links.length === 0) return [];
    const studentIds = links.map(l => l.studentId);

    // Fetch bounded attendance
    const allAttendance = await prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds }, date: { gte: thirtyDaysAgo } },
        select: { studentId: true, status: true }
    });

    // Instead of evaluating scores in memory, grab only latest or config bounded records.
    const allGrades = await prisma.gradeRecord.findMany({
        where: {
            studentId: { in: studentIds },
            exam: { isPublished: true } as any
        },
        include: { exam: { select: { config: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100 // Cap memory map!
    }) as any[];

    // Fetch only pending/overdue + 3 recent paid to prevent fetching vast histories
    const allInvoices = await prisma.invoice.findMany({
        where: { studentId: { in: studentIds }, status: { in: ['PENDING', 'OVERDUE'] } },
        select: { studentId: true, status: true, amount: true, createdAt: true },
        take: 50
    });
    
    const recentInvoicesQuery = await prisma.invoice.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true, amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    return links.map((link) => {
        const sid = link.student.id;

        const studentAttendance = allAttendance.filter(a => a.studentId === sid);
        const presentCount = studentAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendancePct = studentAttendance.length > 0
            ? (presentCount / studentAttendance.length) * 100
            : 100;

        const studentGrades = allGrades.filter(g => g.studentId === sid);
        let averageScore = 0;
        if (studentGrades.length > 0) {
            const total = studentGrades.reduce((acc: number, g: any) => {
                const max = (g.exam?.config as any)?.maxScore || 100;
                return acc + (Number(g.score) / max);
            }, 0);
            averageScore = (total / studentGrades.length) * 100;
        }

        const studentInvoices = allInvoices.filter(i => i.studentId === sid);
        const totalOutstanding = studentInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

        const recentInvoices = recentInvoicesQuery
            .filter(i => i.studentId === sid)
            .slice(0, 3);

        return {
            ...link.student,
            recentInvoices,
            stats: {
                attendancePct: attendancePct.toFixed(1),
                averageScore: averageScore.toFixed(1),
                invoiceCount: studentInvoices.length,
                totalOutstanding: totalOutstanding.toFixed(2)
            }
        };
    });
};

export const getFamilyChildren = unstable_cache(
    _getFamilyChildren,
    ['family-children-data'],
    { revalidate: 60 } // 1 minute cache
);


// Refactor 2: getTeacherDashboardData
const _getTeacherDashboardData = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [assignments, recentExams, clockInRecord] = await Promise.all([
        prisma.teacherAssignment.findMany({
            where: { teacherId: userId },
            include: {
                class: {
                    include: {
                        grade: true,
                        _count: { select: { students: true } }
                    }
                },
                subject: true
            }
        }),
        prisma.exam.findMany({
            where: { createdById: userId, dueAt: { gte: thirtyDaysAgo } }, // Bounded
            include: { gradeRecords: true, subject: true },
            orderBy: { dueAt: 'desc' },
            take: 3
        }),
        prisma.staffAttendanceRecord.findFirst({
            where: {
                userId: userId,
                date: { gte: today }
            }
        })
    ]);

    const classIds = assignments.map(a => a.classId);
    const subjectIds = assignments.map(a => a.subjectId);

    // Fetch averages directly if possible, or grab recent bounds
    const [allGrades, attendanceStats] = await Promise.all([
        prisma.gradeRecord.findMany({
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds },
                createdAt: { gte: thirtyDaysAgo } // BOUNDED!
            },
            select: { score: true, subjectId: true, student: { select: { classId: true } } },
            take: 1000
        }),
        prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { classId: { in: classIds }, date: { gte: thirtyDaysAgo } },
            _count: true
        })
    ]);

    const classes = assignments.map((a: any) => {
        const relevantGrades = allGrades.filter(g =>
            g.student.classId === a.classId && g.subjectId === a.subjectId
        );
        const avgGrade = relevantGrades.length > 0
            ? relevantGrades.reduce((acc, curr) => acc + Number(curr.score), 0) / relevantGrades.length
            : null;

        return {
            id: a.id,
            classId: a.classId,
            className: a.class.name,
            subjectId: a.subjectId,
            subjectName: a.subject.name,
            gradeLevel: a.class.grade.level,
            studentCount: a.class._count.students,
            avgGrade
        };
    });

    const statsMap = Object.fromEntries(attendanceStats.map(stat => [stat.status, stat._count]));
    const total = Object.values(statsMap).reduce((a: any, b: any) => a + b, 0);
    const present = ((statsMap['PRESENT'] as any) || 0) + ((statsMap['LATE'] as any) || 0);

    return {
        classes,
        exams: recentExams,
        isClockedIn: !!clockInRecord,
        attendanceSummary: [
            { label: "Attendance Rate", value: total > 0 ? `${((present / total) * 100).toFixed(0)}%` : "100%", trend: "Institutional Avg", color: "text-eduGreen-500" },
            { label: "Missing Records", value: "0", trend: "Today", color: "text-zinc-500" }
        ]
    };
}

export const getTeacherDashboardData = unstable_cache(
    _getTeacherDashboardData,
    ['teacher-dashboard-data'],
    { revalidate: 60 }
);


// Refactor 3: getSchoolAnalytics
const _getSchoolAnalytics = async (schoolId: string) => {
    const schoolClasses = await prisma.class.findMany({
        where: { grade: { schoolId } },
        select: { id: true }
    });
    const classIds = schoolClasses.map(c => c.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // FETCH ONCE instead of inside a promise map
    const rawAttendanceCounts = await (prisma.attendanceRecord as any).groupBy({
        by: ['status', 'date'],
        where: {
            classId: { in: classIds },
            date: { gte: sevenDaysAgo }
        },
        _count: { id: true }
    }) as any[];

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        // Find matching raw attendance for this day
        const groupedForDay = rawAttendanceCounts.filter((r: any) => {
            const rowDate = new Date(r.date);
            rowDate.setHours(0,0,0,0);
            return rowDate.getTime() === d.getTime();
        });

        const present = groupedForDay.filter((c: any) => c.status === 'PRESENT' || c.status === 'LATE')
            .reduce((sum: number, c: any) => sum + (c._count?.id || 0), 0);
        const absent = groupedForDay.filter((c: any) => c.status === 'ABSENT')
            .reduce((sum: number, c: any) => sum + (c._count?.id || 0), 0);
        const total = present + absent;

        days.push({
            date: d.toISOString(),
            percentage: total > 0 ? (present / total) * 100 : 100,
            total
        });
    }
    const attendanceData = days;

    const schoolSubjects = await prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, name: true }
    });
    const subjectIds = schoolSubjects.map(s => s.id);

    // Rest of aggregations using batching bounds
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const gradeStats = await (prisma.gradeRecord as any).groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: subjectIds }, createdAt: { gte: thirtyDaysAgo } }, // bounded
        _avg: { score: true },
        _count: { id: true }
    }) as any[];

    const performanceBySubject = gradeStats.map(s => ({
        name: schoolSubjects.find(sub => sub.id === s.subjectId)?.name || 'Unknown',
        avg: s._avg.score || 0,
        count: s._count.id
    }));

    const [totalAttendance, presentAttendance, totalExams, lockedExams, recentEvents, studentCount, classCount] = await Promise.all([
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } }, date: { gte: sevenDaysAgo } } }),
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } }, status: { in: ['PRESENT', 'LATE'] }, date: { gte: sevenDaysAgo } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } }, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } }, isLocked: true, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.event.count({ where: { schoolId, eventDate: { gte: sevenDaysAgo } } }),
        prisma.student.count({ where: { schoolId, enrollmentStatus: 'ACTIVE' } }),
        prisma.class.count({ where: { grade: { schoolId } } })
    ]);

    const staffPresencePresent = await prisma.staffAttendanceRecord.count({
        where: { user: { schoolId }, date: { gte: sevenDaysAgo }, status: 'PRESENT' }
    });
    const staffPresenceTotal = await prisma.user.count({
        where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } }
    });

    const staffedClasses = await prisma.class.count({
        where: {
            grade: { schoolId },
            homeroomTeacher: {
                staffAttendance: {
                    some: { date: { gte: sevenDaysAgo }, status: 'PRESENT' }
                }
            }
        }
    });

    return {
        summary: {
            avgAttendance: totalAttendance > 0 ? `${((presentAttendance / totalAttendance) * 100).toFixed(1)}%` : "100%",
            examCompletion: totalExams > 0 ? `${((lockedExams / totalExams) * 100).toFixed(0)}%` : "0%",
            totalExams,
            lockedExams,
            recentEvents,
            studentCount,
            classCount,
            activeNodes: studentCount + classCount,
            staffPresence: { present: staffPresencePresent, total: staffPresenceTotal, staffedClasses }
        },
        attendance: attendanceData,
        performanceBySubject
    };
}

export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
