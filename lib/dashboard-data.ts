import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Optimized Dashboard Data Fetching for Edge Runtime.
 * Uses Supabase REST API directly when on Edge to bypass Prisma bundling issues.
 */

// Refactor 1: getFamilyChildren
const _getFamilyChildren = async (userId: string) => {
    const isEdge = process.env.NEXT_RUNTIME === 'edge';
    
    if (isEdge) {
        // Edge implementation using Supabase SDK
        const { data: links, error } = await supabaseAdmin
            .from('ParentStudentLink')
            .select(`
                *,
                student:Student(
                    *,
                    grade:Grade(*),
                    school:School(*),
                    class:Class(
                        *,
                        homeroomTeacher:User(id, name)
                    )
                )
            `)
            .eq('parentId', userId);

        if (error || !links) return [];
        // Add more logic here for attendance/grades if needed, or return basic profile
        return links.map(l => l.student);
    }

    // Fallback to Prisma for non-Edge (Node.js)
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
    return links.map(l => l.student);
};

export const getFamilyChildren = unstable_cache(
    _getFamilyChildren,
    ['family-children-data'],
    { revalidate: 60 }
);

// Refactor 2: getTeacherDashboardData
const _getTeacherDashboardData = async (userId: string) => {
    const isEdge = process.env.NEXT_RUNTIME === 'edge';

    if (isEdge) {
        const [assignmentsRes, examsRes, attendanceRes] = await Promise.all([
            supabaseAdmin.from('TeacherAssignment').select('*, class:Class(*, grade:Grade(*)), subject:Subject(*)').eq('teacherId', userId),
            supabaseAdmin.from('Exam').select('*, subject:Subject(*)').eq('createdById', userId).limit(3),
            supabaseAdmin.from('StaffAttendanceRecord').select('*').eq('userId', userId).gte('date', new Date().toISOString().split('T')[0]).maybeSingle()
        ]);

        return {
            classes: (assignmentsRes.data || []).map(a => ({
                id: a.id,
                className: a.class?.name,
                subjectName: a.subject?.name,
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
    const [assignments, recentExams, clockInRecord] = await Promise.all([
        prisma.teacherAssignment.findMany({
            where: { teacherId: userId },
            include: { class: { include: { grade: true } }, subject: true }
        }),
        prisma.exam.findMany({
            where: { createdById: userId },
            include: { subject: true },
            take: 3
        }),
        prisma.staffAttendanceRecord.findFirst({
            where: { userId, date: { gte: new Date(new Date().setHours(0,0,0,0)) } }
        })
    ]);

    return {
        classes: assignments.map(a => ({
            id: a.id,
            className: a.class.name,
            subjectName: a.subject.name,
            studentCount: 0
        })),
        exams: recentExams,
        isClockedIn: !!clockInRecord,
        attendanceSummary: []
    };
};

export const getTeacherDashboardData = unstable_cache(
    _getTeacherDashboardData,
    ['teacher-dashboard-data'],
    { revalidate: 60 }
);

// Refactor 3: getSchoolAnalytics
const _getSchoolAnalytics = async (schoolId: string) => {
    const isEdge = process.env.NEXT_RUNTIME === 'edge';

    if (isEdge) {
        const [students, classes] = await Promise.all([
            supabaseAdmin.from('Student').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId),
            supabaseAdmin.from('Class').select('id', { count: 'exact', head: true }).eq('grade.schoolId', schoolId)
        ]);

        return {
            summary: {
                studentCount: students.count || 0,
                classCount: classes.count || 0,
                avgAttendance: "100%"
            },
            attendance: [],
            performanceBySubject: []
        };
    }

    // Standard Prisma Logic for Node.js
    const [studentCount, classCount] = await Promise.all([
        prisma.student.count({ where: { schoolId } }),
        prisma.class.count({ where: { grade: { schoolId } } })
    ]);

    return {
        summary: { studentCount, classCount, avgAttendance: "100%" },
        attendance: [],
        performanceBySubject: []
    };
};

export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
