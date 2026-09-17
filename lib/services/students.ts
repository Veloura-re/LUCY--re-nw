import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { createClient } from '@supabase/supabase-js';

// Helper to get supabase client on Edge
const getSupabase = () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged operations.");
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

/**
 * Service to fetch all students for a school with persistent caching.
 */
export const getCachedSchoolStudents = (schoolId: string) => {
    return unstable_cache(
        async () => {
const isEdge = !prisma;

            if (isEdge) {
                try {
                    const supabase = getSupabase();
                    const { data: students, error } = await supabase
                        .from('Student')
                        .select('*, grade:Grade(*), class:Class(*), parentLinks:ParentStudentLink(*, parent:User(id, name, role)), invoices:Invoice(*)')
                        .eq('schoolId', schoolId)
                        .order('lastName', { ascending: true });

                    if (!error && students) {
                        return students.map((s: any) => {
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
                } catch {
                    // Fall through to Prisma query below
                }
            }

            // Node.js Prisma Fallback
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
const isEdge = !prisma;

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

export interface StudentQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    classId?: string;
    sortBy?: 'NAME' | 'CLASS';
    sortDir?: 'ASC' | 'DESC';
}

/**
 * Service to fetch paginated students with dynamic filtering.
 */
export const getPaginatedSchoolStudents = async (schoolId: string, params: StudentQueryParams = {}) => {
const isEdge = !prisma;
    
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    if (isEdge) {
        const supabase = getSupabase();
        let query = supabase
            .from('Student')
            .select('*, grade:Grade(*), class:Class(*), parentLinks:ParentStudentLink(*, parent:User(id, name, role)), invoices:Invoice(*)', { count: 'exact' })
            .eq('schoolId', schoolId);

        if (params.classId && params.classId !== 'ALL') {
            query = query.eq('classId', params.classId);
        }
        
        if (params.search) {
            query = query.or(`firstName.ilike.%${params.search}%,lastName.ilike.%${params.search}%,studentCode.ilike.%${params.search}%`);
        }

        if (params.sortBy === 'CLASS') {
            // Note: Supabase Edge doesn't natively sort by foreign table column easily without rpc or views. 
            // We'll sort by classId as a proxy or fallback to lastName.
            query = query.order('classId', { ascending: params.sortDir === 'ASC' });
        } else {
            query = query.order('lastName', { ascending: params.sortDir === 'ASC' });
        }

        query = query.range(offset, offset + limit - 1);

        const { data: students, count } = await query;

        const result = (students || []).map((s: any) => {
            const unpaidInvoices = (s.invoices || []).filter((inv: any) => ['PENDING', 'OVERDUE'].includes(inv.status));
            const outstanding = unpaidInvoices.reduce((acc: number, inv: any) => acc + Number(inv.amount), 0);
            return {
                ...s,
                finance: { unpaidCount: unpaidInvoices.length, outstanding: outstanding.toFixed(2) }
            };
        });

        return {
            data: result,
            metadata: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };
    }

    // Node.js Prisma Fallback
    
    const where: any = { schoolId };
    if (params.classId && params.classId !== 'ALL') {
        where.classId = params.classId;
    }
    if (params.search) {
        where.OR = [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
            { studentCode: { contains: params.search, mode: 'insensitive' } }
        ];
    }

    let orderBy: any = { lastName: params.sortDir === 'DESC' ? 'desc' : 'asc' };
    if (params.sortBy === 'CLASS') {
        orderBy = { class: { name: params.sortDir === 'DESC' ? 'desc' : 'asc' } };
    }

    const [total, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
            where,
            include: {
                grade: true,
                class: true,
                parentLinks: { include: { parent: { select: { id: true, name: true, role: true } } } },
                invoices: { where: { status: { in: ['PENDING', 'OVERDUE'] } }, select: { amount: true } }
            },
            orderBy,
            skip: offset,
            take: limit
        })
    ]);

    const result = students.map((s: any) => {
        const outstanding = s.invoices.reduce((acc: number, inv: any) => acc + Number(inv.amount), 0);
        return {
            ...s,
            finance: { unpaidCount: s.invoices.length, outstanding: outstanding.toFixed(2) }
        };
    });

    return JSON.parse(JSON.stringify({
        data: result,
        metadata: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }));
};

