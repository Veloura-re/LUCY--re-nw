import { prisma } from '@/lib/prisma';

export async function getFamilyChildren(userId: string) {
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

    const allAttendance = await prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true }
    });

    const allGrades = await prisma.gradeRecord.findMany({
        where: {
            studentId: { in: studentIds },
            exam: { isPublished: true } as any
        },
        include: { exam: { select: { config: true } } }
    }) as any[];

    const allInvoices = await prisma.invoice.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true, amount: true, createdAt: true }
    });

    return links.map((link) => {
        const sid = link.student.id;

        const studentAttendance = allAttendance.filter(a => a.studentId === sid);
        const presentCount = studentAttendance.filter(a => a.status === 'PRESENT').length;
        const attendancePct = studentAttendance.length > 0
            ? (presentCount / studentAttendance.length) * 100
            : 100;

        const studentGrades = allGrades.filter(g => g.studentId === sid);
        let averageScore = 0;
        if (studentGrades.length > 0) {
            const total = studentGrades.reduce((acc: number, g: any) => {
                const max = (g.exam?.config as any)?.maxScore || 100;
                return acc + (g.score / max);
            }, 0);
            averageScore = (total / studentGrades.length) * 100;
        }

        const studentInvoices = allInvoices.filter(i => i.studentId === sid);
        const unpaidInvoices = studentInvoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
        const totalOutstanding = unpaidInvoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

        const recentInvoices = allInvoices
            .filter(i => i.studentId === sid)
            .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
            .slice(0, 3);

        return {
            ...link.student,
            recentInvoices,
            stats: {
                attendancePct: attendancePct.toFixed(1),
                averageScore: averageScore.toFixed(1),
                invoiceCount: unpaidInvoices.length,
                totalOutstanding: totalOutstanding.toFixed(2)
            }
        };
    });
}

export async function getTeacherDashboardData(userId: string) {
    const [assignments, recentExams, clockInRecord] = await Promise.all([
        prisma.teacherAssignment.findMany({
            where: { teacherId: userId },
            include: {
                class: {
                    include: {
                        grade: true,
                        _count: {
                            select: { students: true }
                        }
                    }
                },
                subject: true
            }
        }),
        prisma.exam.findMany({
            where: { createdById: userId },
            include: {
                gradeRecords: true,
                subject: true
            },
            orderBy: { dueAt: 'desc' },
            take: 3
        }),
        prisma.staffAttendanceRecord.findFirst({
            where: {
                userId: userId,
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(24, 0, 0, 0))
                }
            }
        })
    ]);

    const classIds = assignments.map(a => a.classId);
    const subjectIds = assignments.map(a => a.subjectId);

    const [allGrades, attendanceStats] = await Promise.all([
        prisma.gradeRecord.findMany({
            where: {
                student: { classId: { in: classIds } },
                subjectId: { in: subjectIds }
            },
            select: {
                score: true,
                subjectId: true,
                student: { select: { classId: true } }
            }
        }),
        prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { classId: { in: classIds } },
            _count: true
        })
    ]);

    const classes = assignments.map((a: any) => {
        const relevantGrades = allGrades.filter(g =>
            g.student.classId === a.classId && g.subjectId === a.subjectId
        );

        const avgGrade = relevantGrades.length > 0
            ? relevantGrades.reduce((acc, curr) => acc + curr.score, 0) / relevantGrades.length
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

    const statsMap = Object.fromEntries(
        attendanceStats.map(stat => [stat.status, stat._count])
    );

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

export async function getSchoolAnalytics(schoolId: string) {
    const schoolClasses = await prisma.class.findMany({
        where: { grade: { schoolId } },
        select: { id: true }
    });
    const classIds = schoolClasses.map(c => c.id);

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

    const schoolSubjects = await prisma.subject.findMany({
        where: { schoolId },
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

    const [totalAttendance, presentAttendance, totalExams, lockedExams, recentEvents, studentCount, classCount] = await Promise.all([
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } } } }),
        prisma.attendanceRecord.count({ where: { class: { grade: { schoolId } }, status: { in: ['PRESENT', 'LATE'] } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } } } }),
        prisma.exam.count({ where: { class: { grade: { schoolId } }, isLocked: true } }),
        prisma.event.count({ where: { schoolId, eventDate: { gte: days[0] } } }),
        prisma.student.count({ where: { schoolId } }),
        prisma.class.count({ where: { grade: { schoolId } } })
    ]);

    const staffPresencePresent = await prisma.staffAttendanceRecord.count({
        where: { user: { schoolId }, date: { gte: days[days.length - 1] }, status: 'PRESENT' }
    });
    const staffPresenceTotal = await prisma.user.count({
        where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } }
    });
    const staffedClasses = await prisma.class.count({
        where: {
            grade: { schoolId },
            homeroomTeacher: {
                staffAttendance: {
                    some: {
                        date: { gte: days[days.length - 1] },
                        status: 'PRESENT'
                    }
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
            staffPresence: {
                present: staffPresencePresent,
                total: staffPresenceTotal,
                staffedClasses
            }
        },
        attendance: attendanceData,
        performanceBySubject
    };
}
