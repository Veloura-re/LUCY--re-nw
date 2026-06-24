// Removed top-level prisma to prevent Edge runtime initialization issues
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Moved supabaseAdmin inside functions to ensure runtime evaluation of Edge env vars

/**
 * Optimized Dashboard Data Fetching for Edge Runtime.
 * Uses Supabase REST API directly when on Edge to bypass Prisma bundling issues.
 */

// Refactor 1: getFamilyChildren
const _getFamilyChildren = async (userId: string) => {
    const { prisma: _p1 } = require('@/lib/prisma');
    const isEdge = !_p1;
    
    if (isEdge) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: links } = await supabaseAdmin
            .from('ParentStudentLink')
            .select(`
                *,
                student:Student(
                    *,
                    grade:Grade(*),
                    school:School(*),
                    class:Class(*, homeroomTeacher:User(id, name))
                )
            `)
            .eq('parentId', userId);

        if (!links) return [];
        return links.map((l: any) => l.student);
    }

    const { prisma } = require('@/lib/prisma');
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

    const students = links.map((l: any) => l.student);

    // Fetch live stats for each student in parallel
    const studentsWithStats = await Promise.all(
        students.map(async (student: any) => {
            const [allAttendance, gradeRecords, pendingInvoiceCount, totalAssignments, completedAssignments, recentInvoices, outstandingInvoices] = await Promise.all([
                prisma.attendanceRecord.findMany({
                    where: { studentId: student.id },
                    select: { status: true }
                }),
                prisma.gradeRecord.findMany({
                    where: { studentId: student.id },
                    include: { exam: { select: { totalMarks: true } } }
                }),
                prisma.invoice.count({
                    where: { studentId: student.id, status: { in: ['PENDING', 'OVERDUE'] } }
                }),
                student.classId ? prisma.assignment.count({
                    where: { classId: student.classId, isPublished: true }
                }) : Promise.resolve(0),
                prisma.assignmentSubmission.count({
                    where: { studentId: student.id, status: { in: ['SUBMITTED', 'GRADED'] } }
                }),
                prisma.invoice.findMany({
                    where: { studentId: student.id },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: { id: true, amount: true, status: true, createdAt: true }
                }),
                prisma.invoice.findMany({
                    where: { studentId: student.id, status: { in: ['PENDING', 'OVERDUE'] } },
                    select: { amount: true }
                })
            ]);

            const totalPresent = allAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
            const attendancePct = allAttendance.length > 0
                ? ((totalPresent / allAttendance.length) * 100).toFixed(1)
                : '100.0';

            let totalScore = 0;
            let totalMax = 0;
            gradeRecords.forEach((gr: any) => {
                const max = gr.exam?.totalMarks || 100;
                totalScore += Number(gr.score);
                totalMax += Number(max);
            });
            const averageScore = totalMax > 0
                ? ((totalScore / totalMax) * 100).toFixed(1)
                : '0.0';

            const totalOutstanding = outstandingInvoices
                .reduce((acc: number, inv: any) => acc + Number(inv.amount), 0)
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
        })
    );

    return JSON.parse(JSON.stringify(studentsWithStats));
};

export const getFamilyChildren = unstable_cache(
    _getFamilyChildren,
    ['family-children-data'],
    { revalidate: 60 }
);

// Refactor 2: getTeacherDashboardData
const _getTeacherDashboardData = async (userId: string) => {
    const { prisma: _p2 } = require('@/lib/prisma');
    const isEdge = !_p2;

    if (isEdge) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const [assignmentsRes, examsRes, attendanceRes] = await Promise.all([
            supabaseAdmin.from('TeacherAssignment').select('*, class:Class(*, grade:Grade(*)), subject:Subject(*)').eq('teacherId', userId),
            supabaseAdmin.from('Exam').select('*, subject:Subject(*)').eq('createdById', userId).limit(3),
            supabaseAdmin.from('StaffAttendanceRecord').select('*').eq('userId', userId).gte('date', new Date().toISOString().split('T')[0]).maybeSingle()
        ]);

        return {
            classes: (assignmentsRes.data || []).map(a => ({
                id: a.id,
                classId: a.classId,
                className: a.class?.name,
                subjectName: a.subject?.name,
                gradeLevel: a.class?.grade?.level || 0,
                studentCount: 0 // Simplification for Edge
            })),
            exams: examsRes.data || [],
            isClockedIn: !!attendanceRes.data,
            attendanceSummary: [
                { label: "Attendance Rate", value: "100%", trend: "Institutional Avg", color: "text-eduGreen-500" }
            ]
        };
    }

    // Standard Prisma Logic for Node.js
    const { prisma } = require('@/lib/prisma');
    
    const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: userId },
        include: { class: { include: { grade: true } }, subject: true }
    });
    
    const recentExams = await prisma.exam.findMany({
        where: { createdById: userId },
        include: { subject: true },
        take: 3
    });
    
    const clockInRecord = await prisma.staffAttendanceRecord.findFirst({
        where: { userId, date: { gte: new Date(new Date().setHours(0,0,0,0)) } }
    });

    return JSON.parse(JSON.stringify({
        classes: assignments.map((a: any) => ({
            id: a.id,
            classId: a.classId,
            className: a.class.name,
            subjectName: a.subject.name,
            gradeLevel: a.class.grade?.level || 0,
            studentCount: 0
        })),
        exams: recentExams,
        isClockedIn: !!clockInRecord,
        attendanceSummary: []
    }));
};

export const getTeacherDashboardData = unstable_cache(
    _getTeacherDashboardData,
    ['teacher-dashboard-data'],
    { revalidate: 60 }
);

// Refactor 3: getSchoolAnalytics
const _getSchoolAnalytics = async (schoolId: string) => {
    const { prisma: _p3 } = require('@/lib/prisma');
    const isEdge = !_p3;

    if (isEdge) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: grades } = await supabaseAdmin.from('Grade').select('id').eq('schoolId', schoolId);
        const gradeIds = (grades || []).map((g: any) => g.id);
        const [students, classes, teachers, principals, approvals] = await Promise.all([
            supabaseAdmin.from('Student').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId),
            supabaseAdmin.from('Class').select('id', { count: 'exact', head: true }).in('gradeId', gradeIds),
            supabaseAdmin.from('User').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId).in('role', ['TEACHER', 'HOMEROOM']),
            supabaseAdmin.from('User').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId).eq('role', 'PRINCIPAL'),
            supabaseAdmin.from('ActionRequest').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId).eq('status', 'PENDING')
        ]);

        const teacherCount = teachers.count || 0;
        const principalCount = principals.count || 0;
        const pendingApprovals = approvals.count || 0;

        return {
            summary: {
                studentCount: students.count || 0,
                classCount: classes.count || 0,
                avgAttendance: "100%",
                activeNodes: teacherCount,
                staffPresence: { present: teacherCount, total: teacherCount },
                principalCount,
                pendingApprovals,
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

    // Standard Prisma Logic for Node.js
    const { prisma } = require('@/lib/prisma');
    
    const schoolInfo = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, schoolCode: true, domain: true, status: true, attendanceConfig: true, communicationsConfig: true, createdAt: true }
    });
    const studentCount = await prisma.student.count({ where: { schoolId } });
    const classCount = await prisma.class.count({ where: { grade: { schoolId } } });
    const teacherCount = await prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } } });
    const principalCount = await prisma.user.count({ where: { schoolId, role: 'PRINCIPAL' } });
    const pendingApprovals = await prisma.actionRequest.count({ where: { schoolId, status: 'PENDING' } });

    // Financial Data
    const invoices = await prisma.invoice.findMany({
        where: { schoolId },
        select: { amount: true, status: true, payments: { select: { amount: true, status: true } } }
    });
    let collectedFees = 0;
    let pendingFees = 0;
    invoices.forEach((inv: any) => {
        const paid = inv.payments.filter((p: any) => p.status === 'COMPLETED').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        collectedFees += paid;
        if (inv.status !== 'PAID') {
            pendingFees += (Number(inv.amount) - paid);
        }
    });

    // Attendance Trends (last 5 days)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: { class: { grade: { schoolId } }, date: { gte: fiveDaysAgo } },
        select: { date: true, status: true }
    });
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

    // Academic Performance (Assignments + Exams)
    const submissions = await prisma.assignmentSubmission.findMany({
        where: { schoolId, status: 'GRADED', grade: { not: null } },
        include: { assignment: { select: { subject: { select: { name: true } }, maxScore: true } } }
    });
    const gradeRecords = await prisma.gradeRecord.findMany({
        where: { student: { schoolId }, status: 'SUBMITTED' },
        include: { subject: { select: { name: true } }, exam: { select: { totalMarks: true } } }
    });

    const subjectScores = new Map();
    
    submissions.forEach((sub: any) => {
        const subj = sub.assignment.subject.name;
        if (!subjectScores.has(subj)) subjectScores.set(subj, { total: 0, count: 0 });
        const stats = subjectScores.get(subj);
        const max = sub.assignment.maxScore || 100;
        const percentage = (sub.grade / max) * 100;
        stats.total += percentage;
        stats.count++;
    });

    gradeRecords.forEach((record: any) => {
        const subj = record.subject.name;
        if (!subjectScores.has(subj)) subjectScores.set(subj, { total: 0, count: 0 });
        const stats = subjectScores.get(subj);
        const max = record.exam.totalMarks || 100;
        const percentage = (record.score / max) * 100;
        stats.total += Math.min(percentage, 100); // Prevent over 100%
        stats.count++;
    });
    const performanceBySubject = Array.from(subjectScores.entries()).map(([name, stats]: any) => ({
        name,
        avg: stats.total / stats.count
    }));

    // Syllabus Saturation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAssignments = await prisma.assignment.count({ where: { schoolId, createdAt: { gte: thirtyDaysAgo } } });
    const totalAssignments = await prisma.assignment.count({ where: { schoolId } });
    const examCompletion = totalAssignments > 0 ? ((recentAssignments / totalAssignments) * 100).toFixed(0) + "%" : "0%";

    // Recent Activity
    const recentActivityRaw = await prisma.auditLog.findMany({
        where: { user: { schoolId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, role: true } } }
    });
    const recentActivity = recentActivityRaw.map((log: any) => ({
        id: log.id,
        user: log.user.name,
        role: log.user.role,
        action: log.action,
        resource: log.resourceType,
        time: log.createdAt.toISOString()
    }));

    // Resource Engagement Pulse
    const activeReaders = await prisma.resourceProgress.count({
        where: { book: { schoolId }, completed: false }
    });

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
        performanceBySubject,
        recentActivity
    }));
};

export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
