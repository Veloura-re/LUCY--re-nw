import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag, getUserTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';
import { prisma as globalPrisma } from '@/lib/prisma'; // Ensure webpack bundles prisma

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Fetch assigned classes for a teacher with caching.
 */
export const getCachedTeacherClasses = (teacherId: string, schoolId: string) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;
            
            if (isEdge) {
                const supabase = getSupabase();
                
                // 1. Fetch assignments
                const { data: assignments } = await supabase
                    .from('TeacherAssignment')
                    .select('*, class:Class(*, grade:Grade(*)), subject:Subject(*)')
                    .eq('teacherId', teacherId);

                // 2. Fetch homeroom assignments
                const { data: homerooms } = await supabase
                    .from('Class')
                    .select('*, grade:Grade(*)')
                    .eq('homeroomTeacherId', teacherId);

                const classesMap = new Map<string, any>();

                (assignments || []).forEach((a: any) => {
                    if (!classesMap.has(a.classId)) {
                        classesMap.set(a.classId, {
                            classId: a.classId,
                            className: `${a.class?.grade?.name || ''} ${a.class?.name || ''}`.trim(),
                            subjects: []
                        });
                    }
                    const cls = classesMap.get(a.classId);
                    if (a.subject) {
                        cls.subjects.push({ id: a.subject.id, name: a.subject.name });
                    }
                });

                (homerooms || []).forEach((h: any) => {
                    if (!classesMap.has(h.id)) {
                        classesMap.set(h.id, {
                            classId: h.id,
                            className: `${h.grade?.name || ''} ${h.name || ''}`.trim(),
                            subjects: []
                        });
                    }
                });

                return Array.from(classesMap.values());
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId },
                include: {
                    class: {
                        select: { id: true, name: true, grade: { select: { name: true } } }
                    },
                    subject: {
                        select: { id: true, name: true }
                    }
                }
            });

            const homerooms = await prisma.class.findMany({
                where: { homeroomTeacherId: teacherId },
                select: { id: true, name: true, grade: { select: { name: true } } }
            });

            const classesMap = new Map<string, any>();
            assignments.forEach(a => {
                if (!classesMap.has(a.classId)) {
                    classesMap.set(a.classId, {
                        classId: a.classId,
                        className: `${a.class.grade.name} ${a.class.name}`,
                        subjects: []
                    });
                }
                const cls = classesMap.get(a.classId);
                cls.subjects.push({ id: a.subject.id, name: a.subject.name });
            });

            homerooms.forEach(h => {
                if (!classesMap.has(h.id)) {
                    classesMap.set(h.id, {
                        classId: h.id,
                        className: `${h.grade.name} ${h.name}`,
                        subjects: []
                    });
                }
            });

            return Array.from(classesMap.values());
        },
        [getUserTag(teacherId), 'teacher-classes'],
        {
            tags: [getSchoolTag(CACHE_TAGS.CLASSES, schoolId), getUserTag(teacherId)],
            revalidate: 3600
        }
    )();
};

/**
 * Fetch the complete student/attendance matrix for a specific cohort and date.
 */
export const getAttendanceMatrix = (
    schoolId: string,
    classId: string,
    date: string,
    subjectId?: string,
    periodId?: string
) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            if (isEdge) {
                const supabase = getSupabase();
                
                const { data: students } = await supabase
                    .from('Student')
                    .select('id, firstName, lastName, studentCode, photoUrl')
                    .eq('schoolId', schoolId)
                    .eq('classId', classId)
                    .order('lastName', { ascending: true })
                    .order('firstName', { ascending: true });

                if (!students || students.length === 0) return { students: [], records: [], authorizations: [] };

                const studentIds = students.map(s => s.id);
                
                // Fetch attendance records and authorizations in parallel
                let query = supabase.from('AttendanceRecord').select('*').eq('classId', classId).eq('date', targetDate.toISOString().split('T')[0]);
                if (subjectId) query = query.eq('subjectId', subjectId);
                if (periodId) query = query.eq('periodId', periodId);

                const [recordsRes, authorizationsRes] = await Promise.all([
                    query,
                    supabase.from('AbsenceAuthorization')
                        .select('*')
                        .in('studentId', studentIds)
                        .lte('startDate', targetDate.toISOString())
                        .gte('endDate', targetDate.toISOString())
                        .eq('status', 'APPROVED')
                ]);

                return {
                    students,
                    records: recordsRes.data || [],
                    authorizations: authorizationsRes.data || []
                };
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
            const students = await prisma.student.findMany({
                where: { schoolId, classId },
                select: { id: true, firstName: true, lastName: true, studentCode: true, photoUrl: true },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
            });

            if (students.length === 0) return { students: [], records: [], authorizations: [] };

            const studentIds = students.map(s => s.id);

            const [records, authorizations] = await Promise.all([
                prisma.attendanceRecord.findMany({
                    where: {
                        classId,
                        date: targetDate,
                        ...(subjectId ? { subjectId } : {}),
                        ...(periodId ? { periodId } : {})
                    }
                }),
                prisma.absenceAuthorization.findMany({
                    where: {
                        studentId: { in: studentIds },
                        startDate: { lte: targetDate },
                        endDate: { gte: targetDate },
                        status: 'APPROVED'
                    }
                })
            ]);

            return {
                students,
                records,
                authorizations
            };
        },
        [`attendance-matrix-${classId}-${date}-${subjectId || 'all'}-${periodId || 'all'}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, schoolId)],
            revalidate: 60
        }
    )();
};
