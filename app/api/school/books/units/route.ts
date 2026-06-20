import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            let student: any = null;
            if (studentId) {
                const { data } = await supabaseAdmin
                    .from('Student')
                    .select('gradeId, classId')
                    .eq('id', studentId)
                    .maybeSingle();
                student = data;
            }

            // Fetch all books with subject and grade in this school
            const [booksRes, gradesRes, subjectsRes] = await Promise.all([
                supabaseAdmin.from('Book').select('*').eq('schoolId', dbUser.schoolId),
                supabaseAdmin.from('Grade').select('*').eq('schoolId', dbUser.schoolId),
                supabaseAdmin.from('Subject').select('*').eq('schoolId', dbUser.schoolId)
            ]);

            const bookMap = new Map((booksRes.data || []).map((b: any) => [b.id, b]));
            const gradeMap = new Map((gradesRes.data || []).map((g: any) => [g.id, g]));
            const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]));

            // Fetch unit packs and resources
            const [unitPacksRes, resourcesRes] = await Promise.all([
                supabaseAdmin.from('UnitPack').select('*').eq('schoolId', dbUser.schoolId).order('createdAt', { ascending: false }),
                supabaseAdmin.from('UnitPackResource').select('*').order('order', { ascending: true })
            ]);

            const resourceMap = new Map<string, any[]>();
            for (const res of (resourcesRes.data || [])) {
                if (!resourceMap.has(res.unitPackId)) {
                    resourceMap.set(res.unitPackId, []);
                }
                const book = bookMap.get(res.bookId) as any;
                if (book) {
                    resourceMap.get(res.unitPackId)!.push({
                        ...res,
                        book: {
                            ...book,
                            grade: gradeMap.get(book.gradeId) || null,
                            subject: subjectMap.get(book.subjectId) || null
                        }
                    });
                }
            }

            const units = (unitPacksRes.data || []).map((up: any) => {
                const resources = resourceMap.get(up.id) || [];
                if (student) {
                    const hasMatch = resources.some(r => r.book.gradeId === student.gradeId || r.book.classId === student.classId);
                    if (!hasMatch) return null;
                }
                return {
                    ...up,
                    resources
                };
            }).filter(Boolean);

            return NextResponse.json(units);
        }

        let filterClause: any = { schoolId: dbUser.schoolId };

        if (studentId) {
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { gradeId: true, classId: true }
            });
            if (student) {
                filterClause = {
                    schoolId: dbUser.schoolId,
                    resources: {
                        some: {
                            book: {
                                OR: [
                                    { gradeId: student.gradeId },
                                    { classId: student.classId }
                                ]
                            }
                        }
                    }
                };
            }
        }

        const units = await prisma.unitPack.findMany({
            where: filterClause,
            include: {
                resources: {
                    include: {
                        book: {
                            include: { subject: true, grade: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(units);
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json() as any;
        const { title, description, resourceIds } = body;

        if (!title) return new NextResponse("Title required", { status: 400 });

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            if (resourceIds && resourceIds.length > 0) {
                const { data: books } = await supabaseAdmin
                    .from('Book')
                    .select('schoolId')
                    .in('id', resourceIds);

                const invalidBooks = (books || []).filter(b => b.schoolId !== dbUser.schoolId);
                if (invalidBooks.length > 0 || (books || []).length !== resourceIds.length) {
                    return new NextResponse("Forbidden: Invalid cross-tenant book references", { status: 403 });
                }
            }

            const { data: unit, error: uErr } = await supabaseAdmin
                .from('UnitPack')
                .insert({
                    schoolId: dbUser.schoolId!,
                    title,
                    description
                })
                .select()
                .single();

            if (uErr) throw uErr;

            let resources: any[] = [];
            if (resourceIds && resourceIds.length > 0) {
                const { data, error: rErr } = await supabaseAdmin
                    .from('UnitPackResource')
                    .insert(resourceIds.map((id: string, index: number) => ({
                        unitPackId: unit.id,
                        bookId: id,
                        order: index
                    })))
                    .select();
                if (rErr) throw rErr;
                resources = data || [];
            }

            return NextResponse.json({
                ...unit,
                resources
            });
        }

        // Tenant Isolation: Ensure all book IDs belong to this school
        if (resourceIds && resourceIds.length > 0) {
            const books = await prisma.book.findMany({
                where: { id: { in: resourceIds } },
                select: { schoolId: true }
            });
            const invalidBooks = books.filter(b => b.schoolId !== dbUser.schoolId);
            if (invalidBooks.length > 0 || books.length !== resourceIds.length) {
                return new NextResponse("Forbidden: Invalid cross-tenant book references", { status: 403 });
            }
        }

        const unit = await prisma.unitPack.create({
            data: {
                schoolId: dbUser.schoolId!,
                title,
                description,
                resources: {
                    create: (resourceIds || []).map((id: string, index: number) => ({
                        bookId: id,
                        order: index
                    }))
                }
            },
            include: { resources: true }
        });

        return NextResponse.json(unit);
    } catch (e) {
        return handleApiError(e);
    }
}
