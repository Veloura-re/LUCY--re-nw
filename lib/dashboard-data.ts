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
    return links.map(l => l.student);
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
            classId: a.classId,
            className: a.class.name,
            subjectName: a.subject.name,
            gradeLevel: a.class.grade.level,
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
    const { prisma: _p3 } = require('@/lib/prisma');
    const isEdge = !_p3;

    if (isEdge) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: grades } = await supabaseAdmin.from('Grade').select('id').eq('schoolId', schoolId);
        const gradeIds = (grades || []).map((g: any) => g.id);
        const [students, classes, teachers] = await Promise.all([
            supabaseAdmin.from('Student').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId),
            supabaseAdmin.from('Class').select('id', { count: 'exact', head: true }).in('gradeId', gradeIds),
            supabaseAdmin.from('User').select('id', { count: 'exact', head: true }).eq('schoolId', schoolId).in('role', ['TEACHER', 'HOMEROOM'])
        ]);

        const teacherCount = teachers.count || 0;

        return {
            summary: {
                studentCount: students.count || 0,
                classCount: classes.count || 0,
                avgAttendance: "100%",
                activeNodes: teacherCount,
                staffPresence: { present: teacherCount, total: teacherCount }
            },
            attendance: [],
            performanceBySubject: []
        };
    }

    // Standard Prisma Logic for Node.js
    const { prisma } = require('@/lib/prisma');
    const [studentCount, classCount, teacherCount] = await Promise.all([
        prisma.student.count({ where: { schoolId } }),
        prisma.class.count({ where: { grade: { schoolId } } }),
        prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'HOMEROOM'] } } })
    ]);

    return {
        summary: { 
            studentCount, 
            classCount, 
            avgAttendance: "100%",
            activeNodes: teacherCount,
            staffPresence: { present: teacherCount, total: teacherCount } // mock presence for now
        },
        attendance: [],
        performanceBySubject: []
    };
};

export const getSchoolAnalytics = unstable_cache(
    _getSchoolAnalytics,
    ['school-analytics-data'],
    { revalidate: 60 }
);
