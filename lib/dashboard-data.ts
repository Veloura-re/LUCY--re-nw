import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Resilient, Type-Safe Dashboard Data Layer with robust JSON serialization.
 */

// Refactor 1: getFamilyChildren
const _getFamilyChildren = async (userId: string) => {
    try {
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: userId },
            include: {
                student: {
                    include: {
                        grade: true,
                        school: true,
                        class: {
                            include: {
                                homeroomTeacher: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            }
        });

        const students = links.map((l: any) => l.student).filter(Boolean);

        const studentsWithStats = await Promise.all(
            students.map(async (student: any) => {
                try {
                    const [allAttendance, gradeRecords, pendingInvoiceCount, totalAssignments, completedAssignments, recentInvoices, outstandingInvoices] = await Promise.all([
                        prisma.attendanceRecord.findMany({
                            where: { studentId: student.id },
                            select: { status: true }
                        }).catch(() => []),
                        prisma.gradeRecord.findMany({
                            where: { studentId: student.id },
                            include: { exam: { select: { totalMarks: true } } }
                        }).catch(() => []),
                        prisma.invoice.count({
                            where: { studentId: student.id, status: { in: ['PENDING', 'OVERDUE'] } }
                        }).catch(() => 0),
                        student.classId ? prisma.assignment.count({
                            where: { classId: student.classId, isPublished: true }
                        }).catch(() => 0) : Promise.resolve(0),
                        prisma.assignmentSubmission.count({
                            where: { studentId: student.id, status: { in: ['SUBMITTED', 'GRADED'] } }
                        }).catch(() => 0),
                        prisma.invoice.findMany({
                            where: { studentId: student.id },
                            orderBy: { createdAt: 'desc' },
                            take: 3,
                            select: { id: true, amount: true, status: true, createdAt: true }
                        }).catch(() => []),
                        prisma.invoice.findMany({
                            where: { studentId: student.id, status: { in: ['PENDING', 'OVERDUE'] } },
                            select: { amount: true }
                        }).catch(() => [])
                    ]);

                    const totalPresent = allAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
                    const attendancePct = allAttendance.length > 0
                        ? ((totalPresent / allAttendance.length) * 100).toFixed(1)
                        : '100.0';

                    let totalScore = 0;
                    let totalMax = 0;
                    gradeRecords.forEach((gr: any) => {
                        const max = gr.exam?.totalMarks || 100;
                        totalScore += Number(gr.score || 0);
                        totalMax += Number(max || 100);
                    });
                    const averageScore = totalMax > 0
                        ? ((totalScore / totalMax) * 100).toFixed(1)
                        : '0.0';

                    const totalOutstanding = (outstandingInvoices as any[])
                        .reduce((acc: number, inv: any) => acc + Number(inv.amount || 0), 0)
                        .toFixed(2);

                    return {
                        ...student,
                        recentInvoices,
                        stats: {
                            attendancePct,
                            averageScore,
                            invoiceCount: pendingInvoiceCount,
                            totalOutstanding,
                            assignmentStats: {
                                total: totalAssignments,
                                completed: completedAssignments
                            }
                        }
                    };
                } catch (e) {
                    return student;
                }
            })
        );

        return JSON.parse(JSON.stringify(studentsWithStats));
    } catch (e) {
        console.error("[getFamilyChildren] Error:", e);
        return [];
    }
};

export async function getFamilyChildren(userId: string) {
    return unstable_cache(
        () => _getFamilyChildren(userId),
        ['family-children-data', userId],
        { revalidate: 15 }
    )();
}

// Refactor 2: getTeacherDashboardData
const _getTeacherDashboardData = async (userId: string) => {
    try {
        const [assignments, recentExams, clockInRecord] = await Promise.all([
            prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                include: { class: { include: { grade: true } }, subject: true }
            }).catch(() => []),
            prisma.exam.findMany({
                where: { createdById: userId },
                include: { subject: true },
                take: 3
            }).catch(() => []),
            prisma.staffAttendanceRecord.findFirst({
                where: { userId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
            }).catch(() => null)
        ]);

        return JSON.parse(JSON.stringify({
            classes: assignments.map((a: any) => ({
                id: a.id,
                classId: a.classId,
                className: a.class?.name || "Class",
                subjectName: a.subject?.name || "Subject",
                gradeLevel: a.class?.grade?.level || 0,
                studentCount: 0
            })),
            exams: recentExams,
            isClockedIn: !!clockInRecord,
            attendanceSummary: [
                { label: "Attendance Rate", value: "100%", trend: "Institutional Avg", color: "text-eduGreen-500" }
            ]
        }));
    } catch (e) {
        console.error("[getTeacherDashboardData] Error:", e);
        return {
            classes: [],
            exams: [],
            isClockedIn: false,
            attendanceSummary: []
        };
    }
};

export const getTeacherDashboardData = unstable_cache(
    _getTeacherDashboardData,
    ['teacher-dashboard-data'],
    { revalidate: 60 }
);

// Refactor 3: getSchoolAnalytics
const _getSchoolAnalytics = async (schoolId: string) => {
    try {
        const [schoolInfo, studentCount, classCount, teacherCount, principalCount, pendingApprovals, invoices] = await Promise.all([
            prisma.school.findUnique({
                where: { id: schoolId },
                select: { name: true, schoolCode: true, domain: true, status: true, attendanceConfig: true, communicationsConfig: true, createdAt: true }
            }).catch(() => null),
            prisma.student.count({ where: { schoolId } }).catch(() => 0),
            prisma.class.count({ where: { grade: { schoolId } } }).catch(() => 0),
            prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } } }).catch(() => 0),
            prisma.user.count({ where: { schoolId, role: 'PRINCIPAL' } }).catch(() => 0),
            prisma.actionRequest.count({ where: { schoolId, status: 'PENDING' } }).catch(() => 0),
            prisma.invoice.findMany({
                where: { schoolId },
                select: { amount: true, status: true, payments: { select: { amount: true, status: true } } }
            }).catch(() => [])
        ]);

        let collectedFees = 0;
        let pendingFees = 0;
        invoices.forEach((inv: any) => {
            const paid = (inv.payments || [])
                .filter((p: any) => p.status === 'COMPLETED')
                .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
            collectedFees += paid;
            if (inv.status !== 'PAID') {
                pendingFees += (Number(inv.amount || 0) - paid);
            }
        });

        // Attendance Trends (last 5 days)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const attendanceRecords = await prisma.attendanceRecord.findMany({
            where: { class: { grade: { schoolId } }, date: { gte: fiveDaysAgo } },
            select: { date: true, status: true }
        }).catch(() => []);

        const attendanceMap = new Map();
        for (let i = 4; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            attendanceMap.set(d.toISOString().split('T')[0], { present: 0, total: 0 });
        }
        attendanceRecords.forEach((r: any) => {
            const d = r.date.toISOString().split('T')[0];
            if (attendanceMap.has(d)) {
                const stats = attendanceMap.get(d);
                stats.total++;
                if (r.status === 'PRESENT' || r.status === 'LATE') stats.present++;
            }
        });
        const attendance = Array.from(attendanceMap.entries()).map(([date, stats]: any) => ({
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            rate: stats.total > 0 ? (stats.present / stats.total) * 100 : 100
        }));
        const avgAttendance = attendance.length > 0 ? (attendance.reduce((acc: any, curr: any) => acc + curr.rate, 0) / attendance.length).toFixed(1) + "%" : "100%";

        // Syllabus Saturation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [recentAssignments, totalAssignments, activeReaders] = await Promise.all([
            prisma.assignment.count({ where: { schoolId, createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
            prisma.assignment.count({ where: { schoolId } }).catch(() => 0),
            prisma.resourceProgress.count({ where: { book: { schoolId }, completed: false } }).catch(() => 0)
        ]);
        const examCompletion = totalAssignments > 0 ? ((recentAssignments / totalAssignments) * 100).toFixed(0) + "%" : "0%";

        return JSON.parse(JSON.stringify({
            summary: {
                schoolInfo,
                studentCount,
                classCount,
                avgAttendance,
                activeNodes: teacherCount,
                staffPresence: { present: teacherCount, total: teacherCount },
                principalCount,
                pendingApprovals,
                examCompletion,
                collectedFees,
                pendingFees,
                activeReaders
            },
            attendance,
            performanceBySubject: [],
            recentActivity: []
        }));
    } catch (e) {
        console.error("[getSchoolAnalytics] Error:", e);
        return {
            summary: {
                studentCount: 0,
                classCount: 0,
                avgAttendance: "100%",
                activeNodes: 0,
                staffPresence: { present: 0, total: 0 },
                principalCount: 0,
                pendingApprovals: 0,
                examCompletion: "0%",
                collectedFees: 0,
                pendingFees: 0,
                activeReaders: 0
            },
            attendance: [],
            performanceBySubject: [],
            recentActivity: []
        };
    }
};

export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
