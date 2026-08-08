import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Resilient, Type-Safe High-Performance Dashboard Data Layer with robust query batching and JSON serialization.
 */

// Refactor 1: getFamilyChildren (Batched O(1) queries instead of N*7 loop)
const _getFamilyChildren = async (userId: string) => {
    try {
        if (!prisma) return [];

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
        if (students.length === 0) return [];

        const studentIds = students.map((s: any) => s.id);
        const classIds = Array.from(new Set(students.map((s: any) => s.classId).filter(Boolean))) as string[];

        // Parallel batch queries for all children at once
        const [
            allAttendance,
            allGradeRecords,
            allInvoices,
            allSubmissions,
            allAssignments
        ] = await Promise.all([
            prisma.attendanceRecord.findMany({
                where: { studentId: { in: studentIds } },
                select: { studentId: true, status: true }
            }).catch(() => []),
            prisma.gradeRecord.findMany({
                where: { studentId: { in: studentIds } },
                select: { studentId: true, score: true, exam: { select: { totalMarks: true } } }
            }).catch(() => []),
            prisma.invoice.findMany({
                where: { studentId: { in: studentIds } },
                orderBy: { createdAt: 'desc' },
                select: { id: true, studentId: true, amount: true, status: true, createdAt: true }
            }).catch(() => []),
            prisma.assignmentSubmission.findMany({
                where: { studentId: { in: studentIds }, status: { in: ['SUBMITTED', 'GRADED'] } },
                select: { studentId: true }
            }).catch(() => []),
            classIds.length > 0
                ? prisma.assignment.findMany({
                    where: { classId: { in: classIds }, isPublished: true },
                    select: { classId: true }
                }).catch(() => [])
                : Promise.resolve([])
        ]);

        // Group by studentId in memory (O(N))
        const attendanceByStudent = new Map<string, any[]>();
        allAttendance.forEach((att: any) => {
            const list = attendanceByStudent.get(att.studentId) || [];
            list.push(att);
            attendanceByStudent.set(att.studentId, list);
        });

        const gradesByStudent = new Map<string, any[]>();
        allGradeRecords.forEach((gr: any) => {
            const list = gradesByStudent.get(gr.studentId) || [];
            list.push(gr);
            gradesByStudent.set(gr.studentId, list);
        });

        const invoicesByStudent = new Map<string, any[]>();
        allInvoices.forEach((inv: any) => {
            const list = invoicesByStudent.get(inv.studentId) || [];
            list.push(inv);
            invoicesByStudent.set(inv.studentId, list);
        });

        const submissionsByStudent = new Map<string, number>();
        allSubmissions.forEach((sub: any) => {
            submissionsByStudent.set(sub.studentId, (submissionsByStudent.get(sub.studentId) || 0) + 1);
        });

        const assignmentsByClass = new Map<string, number>();
        allAssignments.forEach((assign: any) => {
            assignmentsByClass.set(assign.classId, (assignmentsByClass.get(assign.classId) || 0) + 1);
        });

        const studentsWithStats = students.map((student: any) => {
            const studentAttendance = attendanceByStudent.get(student.id) || [];
            const studentGrades = gradesByStudent.get(student.id) || [];
            const studentInvoices = invoicesByStudent.get(student.id) || [];
            
            const totalPresent = studentAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
            const attendancePct = studentAttendance.length > 0
                ? ((totalPresent / studentAttendance.length) * 100).toFixed(1)
                : '100.0';

            let totalScore = 0;
            let totalMax = 0;
            studentGrades.forEach((gr: any) => {
                const max = gr.exam?.totalMarks || 100;
                totalScore += Number(gr.score || 0);
                totalMax += Number(max || 100);
            });
            const averageScore = totalMax > 0
                ? ((totalScore / totalMax) * 100).toFixed(1)
                : '0.0';

            const pendingInvoices = studentInvoices.filter((inv: any) => inv.status === 'PENDING' || inv.status === 'OVERDUE');
            const totalOutstanding = pendingInvoices
                .reduce((acc: number, inv: any) => acc + Number(inv.amount || 0), 0)
                .toFixed(2);

            const totalAssignments = student.classId ? (assignmentsByClass.get(student.classId) || 0) : 0;
            const completedAssignments = submissionsByStudent.get(student.id) || 0;

            return {
                ...student,
                recentInvoices: studentInvoices.slice(0, 3),
                stats: {
                    attendancePct,
                    averageScore,
                    invoiceCount: pendingInvoices.length,
                    totalOutstanding,
                    assignmentStats: {
                        total: totalAssignments,
                        completed: completedAssignments
                    }
                }
            };
        });

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
        if (!prisma) {
            return { classes: [], exams: [], isClockedIn: false, attendanceSummary: [] };
        }

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

export async function getTeacherDashboardData(userId: string) {
    return unstable_cache(
        () => _getTeacherDashboardData(userId),
        ['teacher-dashboard-data', userId],
        { revalidate: 30 }
    )();
}

// Refactor 3: getSchoolAnalytics
const _getSchoolAnalytics = async (schoolId: string) => {
    try {
        if (!prisma) {
            return {
                summary: {
                    studentCount: 0, classCount: 0, avgAttendance: "100%", activeNodes: 0,
                    staffPresence: { present: 0, total: 0 }, principalCount: 0, pendingApprovals: 0,
                    examCompletion: "0%", collectedFees: 0, pendingFees: 0, activeReaders: 0
                },
                attendance: [], performanceBySubject: [], recentActivity: []
            };
        }

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

export async function getSchoolAnalytics(schoolId: string) {
    return unstable_cache(
        () => _getSchoolAnalytics(schoolId),
        ['school-analytics-data', schoolId],
        { revalidate: 30 }
    )();
}
