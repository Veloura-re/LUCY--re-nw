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

    // Parallelize sub-queries for children stats
    const [allAttendance, allGrades, allInvoices, recentInvoicesQuery, allAssignments, allSubmissions] = await Promise.all([
        // Fetch bounded attendance
        prisma.attendanceRecord.findMany({
            where: { studentId: { in: studentIds }, date: { gte: thirtyDaysAgo } },
            select: { studentId: true, status: true }
        }),
        // Fetch published grades bounded by recent records
        prisma.gradeRecord.findMany({
            where: {
                studentId: { in: studentIds },
                exam: { isPublished: true } as any
            },
            include: { exam: { select: { config: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        }),
        // Fetch pending/overdue invoices
        prisma.invoice.findMany({
            where: { studentId: { in: studentIds }, status: { in: ['PENDING', 'OVERDUE'] } },
            select: { studentId: true, status: true, amount: true, createdAt: true },
            take: 50
        }),
        // Fetch recent invoice history
        prisma.invoice.findMany({
            where: { studentId: { in: studentIds } },
            select: { studentId: true, status: true, amount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        }),
        // Fetch published assignments for the relevant classes
        prisma.assignment.findMany({
            where: { 
                classId: { in: links.map(l => l.student.classId).filter(Boolean) as string[] },
                isPublished: true 
            },
            select: { id: true, classId: true }
        }),
        // Fetch submissions for these students
        prisma.assignmentSubmission.findMany({
            where: { studentId: { in: studentIds } },
            select: { assignmentId: true, studentId: true, status: true }
        })
    ]) as [any[], any[], any[], any[], any[], any[]];


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
                totalOutstanding: totalOutstanding.toFixed(2),
                assignmentStats: {
                    total: allAssignments.filter(a => a.classId === link.student.classId).length,
                    completed: allSubmissions.filter(s => s.studentId === sid).length
                }
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

    const [assignments, recentExams, clockInRecord, pendingGradingCount, recentSubmissions] = await Promise.all([
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
        }),
        prisma.assignmentSubmission.count({
            where: {
                assignment: { teacherId: userId },
                status: 'SUBMITTED'
            }
        }),
        prisma.assignmentSubmission.findMany({
            where: {
                assignment: { teacherId: userId },
                status: 'SUBMITTED'
            },
            include: {
                student: { select: { firstName: true, lastName: true, studentCode: true } },
                assignment: { select: { title: true, subject: { select: { name: true } } } }
            },
            orderBy: { submittedAt: 'desc' },
            take: 3
        })
    ]);

    const classIds = assignments.map(a => a.classId);
    const subjectIds = assignments.map(a => a.subjectId);

    // Use SQL aggregation to calculate averages at the DB level (Offload from Edge Worker)
    const [gradeStats, attendanceStats] = await Promise.all([
        prisma.gradeRecord.groupBy({
            by: ['subjectId', 'studentId'],
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds },
                createdAt: { gte: thirtyDaysAgo }
            },
            _avg: { score: true }
        }),
        prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { classId: { in: classIds }, date: { gte: thirtyDaysAgo } },
            _count: true
        })
    ]);

    // We still need class mapping, so we'll fetch class memberships for the students in those stats
    const studentClassMap = await prisma.student.findMany({
        where: { id: { in: gradeStats.map(s => s.studentId) } },
        select: { id: true, classId: true }
    });

    const classes = assignments.map((a: any) => {
        const relevantStudentIds = studentClassMap.filter(s => s.classId === a.classId).map(s => s.id);
        const relevantStats = gradeStats.filter(s => 
            relevantStudentIds.includes(s.studentId) && s.subjectId === a.subjectId
        );
        
        const avgGrade = relevantStats.length > 0
            ? relevantStats.reduce((acc, curr) => acc + (curr._avg.score || 0), 0) / relevantStats.length
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
        pendingEvaluations: pendingGradingCount,
        recentSubmissions,
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
    // Step 1: Initialize ID maps for scoped queries
    const [schoolClasses, schoolSubjects] = await Promise.all([
        prisma.class.findMany({ where: { grade: { schoolId } }, select: { id: true } }),
        prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true } })
    ]);

    const classIds = schoolClasses.map(c => c.id);
    const subjectIds = schoolSubjects.map(s => s.id);

    // Step 2: Time boundaries
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Step 3: Global Aggregations
    const [
        rawAttendanceCounts, 
        gradeStats, 
        totalAttendance, 
        presentAttendance, 
        totalExams, 
        lockedExams, 
        recentEvents, 
        studentCount, 
        classCount,
        staffPresencePresent,
        staffPresenceTotal,
        staffedClasses,
        assignmentCount,
        submissionCount
    ] = await Promise.all([
        (prisma.attendanceRecord as any).groupBy({
            by: ['status', 'date'],
            where: { classId: { in: classIds }, date: { gte: sevenDaysAgo } },
            _count: { id: true }
        }),
        (prisma.gradeRecord as any).groupBy({
            by: ['subjectId'],
            where: { subjectId: { in: subjectIds }, createdAt: { gte: thirtyDaysAgo } },
            _avg: { score: true },
            _count: { id: true }
        }),
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } }, date: { gte: sevenDaysAgo } } }),
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } }, status: { in: ['PRESENT', 'LATE'] }, date: { gte: sevenDaysAgo } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } }, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } }, isLocked: true, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.event.count({ where: { schoolId, eventDate: { gte: sevenDaysAgo } } }),
        prisma.student.count({ where: { schoolId, enrollmentStatus: 'ACTIVE' } }),
        prisma.class.count({ where: { grade: { schoolId } } }),
        prisma.staffAttendanceRecord.count({ where: { user: { schoolId }, date: { gte: sevenDaysAgo }, status: 'PRESENT' } }),
        prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } } }),
        prisma.class.count({
            where: {
                grade: { schoolId },
                homeroomTeacher: { staffAttendance: { some: { date: { gte: sevenDaysAgo }, status: 'PRESENT' } } }
            }
        }),
        prisma.assignment.count({ where: { schoolId, isPublished: true, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.assignmentSubmission.count({ where: { schoolId, submittedAt: { gte: thirtyDaysAgo } } })
    ]);
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const groupedForDay = rawAttendanceCounts.filter((r: any) => {
            const rowDate = new Date(r.date);
            rowDate.setHours(0,0,0,0);
            return rowDate.getTime() === d.getTime();
        });

        const dayPresent = groupedForDay.filter((c: any) => c.status === 'PRESENT' || c.status === 'LATE')
            .reduce((sum: number, c: any) => sum + (c._count?.id || 0), 0);
        const dayAbsent = groupedForDay.filter((c: any) => c.status === 'ABSENT')
            .reduce((sum: number, c: any) => sum + (c._count?.id || 0), 0);
        const dayTotal = dayPresent + dayAbsent;

        days.push({
            date: d.toISOString(),
            percentage: dayTotal > 0 ? (dayPresent / dayTotal) * 100 : 100,
            total: dayTotal
        });
    }

    // Step 5: Aggregate Performance Metrics
    const performanceBySubject = gradeStats.map(s => ({
        name: schoolSubjects.find(sub => sub.id === s.subjectId)?.name || 'Unknown',
        avg: s._avg.score || 0,
        count: s._count.id
    }));

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
            staffPresence: { present: staffPresencePresent, total: staffPresenceTotal, staffedClasses },
            assignments: { total: assignmentCount, submissions: submissionCount }
        },
        attendance: days,
        performanceBySubject
    };
}


export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
