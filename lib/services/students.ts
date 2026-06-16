import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

/**
 * Service to fetch all students for a school with persistent caching.
 */
export const getCachedSchoolStudents = (schoolId: string) => {
    return unstable_cache(
        async () => {
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                const { data: students } = await supabase
                    .from('Student')
                    .select('*, grade:Grade(*), class:Class(*), parentLinks:ParentStudentLink(*, parent:User(id, name, role)), invoices:Invoice(*)')
                    .eq('schoolId', schoolId)
                    .order('lastName', { ascending: true });

                return (students || []).map((s: any) => {
                    const unpaidInvoices = (s.invoices || []).filter((inv: any) => ['PENDING', 'OVERDUE'].includes(inv.status));
                    const outstanding = unpaidInvoices.reduce((acc: number, inv: any) => acc + Number(inv.amount), 0);

                    return {
                        ...s,
                        finance: {
                            unpaidCount: unpaidInvoices.length,
                            outstanding: outstanding.toFixed(2)
                        }
                    };
                });
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
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

            const result = students.map((s: any) => {
                const unpaidCount = s.invoices.length;
                const outstanding = s.invoices.reduce((acc: number, inv: any) => acc + Number(inv.amount), 0);

                return {
                    ...s,
                    finance: {
                        unpaidCount,
                        outstanding: outstanding.toFixed(2)
                    }
                };
            });
            return JSON.parse(JSON.stringify(result));
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
            const { prisma: _prismaCheck } = require('@/lib/prisma');
            const isEdge = !_prismaCheck;

            if (isEdge) {
                const supabase = getSupabase();
                const { data } = await supabase
                    .from('Student')
                    .select('*, grade:Grade(*), class:Class(*), parentLinks:ParentStudentLink(*, parent:User(id, name, email, role)), attendanceRecords:AttendanceRecord(*), gradeRecords:GradeRecord(*, exam:Exam(*), subject:Subject(*))')
                    .eq('id', studentId)
                    .eq('schoolId', schoolId)
                    .single();
                
                if (data) {
                    data.attendanceRecords = (data.attendanceRecords || []).slice(0, 10).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    data.gradeRecords = (data.gradeRecords || []).filter((gr: any) => gr.exam?.isPublished).slice(0, 10).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                }
                return data;
            }

            // Node.js Prisma Fallback
            const { prisma } = require('@/lib/prisma');
            const result = await prisma.student.findUnique({
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
            return JSON.parse(JSON.stringify(result));
        },
        [`student-dossier-${studentId}`],
        {
            tags: [getSchoolTag(CACHE_TAGS.STUDENTS, schoolId), `student-${studentId}`],
            revalidate: 60
        }
    )();
};
