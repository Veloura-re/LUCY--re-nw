import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag, getUserTag } from '@/lib/cache-keys';
import { AttendanceStatus } from '@prisma/client';

/**
 * Fetch assigned classes for a teacher with caching.
 */
export const getCachedTeacherClasses = (teacherId: string, schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/attendance] Cache MISS for teacher classes: ${teacherId}`);
            
            // 1. Fetch assignments
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

            // 2. Fetch homeroom assignments
            const homerooms = await prisma.class.findMany({
                where: { homeroomTeacherId: teacherId },
                select: { id: true, name: true, grade: { select: { name: true } } }
            });

            // Format into unique structure
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
 * Optimizes the multi-table lookup into a parallelized database hit.
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
            console.log(`[lib/services/attendance] Cache MISS for matrix: ${classId} on ${date}`);

            // 1. Fetch Students in the class
            const students = await prisma.student.findMany({
                where: { schoolId, classId },
                select: { id: true, firstName: true, lastName: true, studentCode: true, photoUrl: true },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
            });

            if (students.length === 0) return { students: [], records: [], authorizations: [] };

            const studentIds = students.map(s => s.id);
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            // 2. Parallel Fetch: Attendance + Authorizations
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
            revalidate: 60 // Short cache for active recording
        }
    )();
};
