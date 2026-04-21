import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Fetch all assignments for a specific class with caching.
 */
export const getCachedClassAssignments = (schoolId: string, classId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/assignments] Cache MISS for class assignments: ${classId}`);
            return await prisma.assignment.findMany({
                where: { classId, schoolId },
                include: {
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } },
                    _count: { select: { submissions: true } }
                },
                orderBy: { dueDate: 'asc' }
            });
        },
        [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `class-${classId}-assignments`],
        {
            tags: [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `class-${classId}-assignments`],
            revalidate: 300 // 5 minutes cache
        }
    )();
};

/**
 * Fetch assignments for a specific student, including their submission status.
 */
export const getCachedStudentAssignments = (schoolId: string, classId: string, studentId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/assignments] Cache MISS for student assignments: ${studentId}`);
            
            const assignments = await prisma.assignment.findMany({
                where: { classId, schoolId, isPublished: true },
                include: {
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } },
                    submissions: {
                        where: { studentId },
                        select: { status: true, submittedAt: true, grade: true }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });

            return assignments.map(a => ({
                ...a,
                submission: a.submissions[0] || null
            }));
        },
        [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `student-${studentId}-assignments`],
        {
            tags: [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `student-${studentId}-assignments`],
            revalidate: 60 // Shorter cache for student personal view
        }
    )();
};

/**
 * Fetch a single assignment with all submissions for teacher review.
 */
export const getCachedAssignmentDetails = (schoolId: string, assignmentId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/assignments] Cache MISS for assignment details: ${assignmentId}`);
            return await prisma.assignment.findUnique({
                where: { id: assignmentId, schoolId },
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    submissions: {
                        include: {
                            student: { select: { firstName: true, lastName: true, studentCode: true } }
                        },
                        orderBy: { submittedAt: 'desc' }
                    }
                }
            });
        },
        [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `assignment-${assignmentId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), `assignment-${assignmentId}`],
            revalidate: 60
        }
    )();
};

/**
 * Fetch a summary of pending assignments for a student (for dashboard widgets).
 */
export const getStudentAssignmentSummary = async (schoolId: string, classId: string, studentId: string) => {
    const assignments = await prisma.assignment.findMany({
        where: { 
            classId, 
            schoolId, 
            isPublished: true,
            dueDate: { gte: new Date() } // Future or current
        },
        include: {
            submissions: {
                where: { studentId },
                select: { status: true }
            }
        },
        take: 5,
        orderBy: { dueDate: 'asc' }
    });

    const pendingCount = assignments.filter(a => a.submissions.length === 0).length;
    
    return {
        recent: assignments.map(a => ({
            id: a.id,
            title: a.title,
            dueDate: a.dueDate,
            status: a.submissions[0]?.status || 'PENDING'
        })),
        pendingCount
    };
};

/**
 * Institutional Analytics for Principals/Directors.
 * Aggregates assignment data across the entire school.
 */
export const getSchoolAssignmentAnalytics = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/assignments] Cache MISS for school analytics: ${schoolId}`);
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const [assignments, totalSubmissions, statusCounts, subjects, recentCount] = await Promise.all([
                prisma.assignment.findMany({
                    where: { schoolId, isPublished: true },
                    include: { subject: { select: { name: true } } }
                }),
                prisma.assignmentSubmission.count({
                    where: { schoolId }
                }),
                prisma.assignmentSubmission.groupBy({
                    by: ['status'],
                    where: { schoolId },
                    _count: true
                }),
                prisma.subject.findMany({
                    where: { schoolId },
                    select: { id: true, name: true }
                }),
                prisma.assignment.count({
                    where: { 
                        schoolId, 
                        isPublished: true,
                        createdAt: { gte: sevenDaysAgo }
                    }
                })
            ]);

            // Group by subject for activity distribution
            const subjectActivity = subjects.map(s => {
                const count = assignments.filter(a => a.subjectId === s.id).length;
                return { name: s.name, count };
            }).sort((a, b) => b.count - a.count).slice(0, 5);

            // Construct status breakdown from grouped counts
            const statusBreakdown = {
                GRADED: statusCounts.find(c => c.status === 'GRADED')?._count || 0,
                SUBMITTED: statusCounts.find(c => c.status === 'SUBMITTED')?._count || 0,
                LATE: statusCounts.find(c => c.status === 'LATE')?._count || 0
            };

            return {
                totalAssignments: assignments.length,
                totalSubmissions,
                subjectActivity,
                statusBreakdown,
                recentCount
            };
        },
        [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), 'school-analytics'],
        {
            tags: [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), 'school-analytics'],
            revalidate: 600
        }
    )();
};

/**
 * Detailed oversight of all active assignments in the school.
 */
export const getDirectorAssignmentOversight = (schoolId: string) => {
    return unstable_cache(
        async () => {
            return await prisma.assignment.findMany({
                where: { schoolId, isPublished: true },
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } },
                    _count: { select: { submissions: true } }
                },
                orderBy: { dueDate: 'asc' },
                take: 50
            });
        },
        [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), 'director-oversight'],
        {
            tags: [getSchoolTag(CACHE_TAGS.ASSIGNMENTS, schoolId), 'director-oversight'],
            revalidate: 300
        }
    )();
};
