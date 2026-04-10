import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

/**
 * Service to fetch all students for a school with persistent caching.
 * Revalidates every 60 seconds (SWR) OR when revalidateTag is called.
 */
export const getCachedSchoolStudents = (schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/students] Cache MISS for school: ${schoolId}`);
            
            const students = await prisma.student.findMany({
                where: { schoolId },
                include: {
                    grade: true,
                    class: true,
                    parentLinks: {
                        include: {
                            parent: {
                                select: { id: true, name: true, role: true }
                            }
                        }
                    },
                    invoices: {
                        where: { status: { in: ['PENDING', 'OVERDUE'] } },
                        select: { amount: true }
                    }
                },
                orderBy: { lastName: 'asc' }
            });

            // Post-process finance stats for consumer consumption
            return students.map(s => {
                const unpaidCount = s.invoices.length;
                const outstanding = s.invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

                return {
                    ...s,
                    finance: {
                        unpaidCount,
                        outstanding: outstanding.toFixed(2)
                    }
                };
            });
        },
        [getSchoolTag(CACHE_TAGS.STUDENTS, schoolId)],
        {
            tags: [getSchoolTag(CACHE_TAGS.STUDENTS, schoolId)],
            revalidate: 60 // 1 minute stale-while-revalidate
        }
    )();
};

/**
 * Fetch a single student's full dossier with caching.
 */
export const getCachedStudentDossier = (studentId: string, schoolId: string) => {
    return unstable_cache(
        async () => {
            console.log(`[lib/services/students] Cache MISS for dossier: ${studentId}`);
            return await prisma.student.findUnique({
                where: { id: studentId, schoolId },
                include: {
                    grade: true,
                    class: true,
                    parentLinks: {
                        include: {
                            parent: {
                                select: { id: true, name: true, email: true, role: true }
                            }
                        }
                    },
                    attendanceRecords: {
                        take: 10,
                        orderBy: { date: 'desc' }
                    },
                    gradeRecords: {
                        where: { exam: { isPublished: true } as any },
                        include: {
                            exam: { select: { title: true, category: true } },
                            subject: { select: { name: true } }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }
                }
            });
        },
        [`student-dossier-${studentId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.STUDENTS, schoolId), `student-${studentId}`],
            revalidate: 60
        }
    )();
};
