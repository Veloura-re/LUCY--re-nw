import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const gradeId = searchParams.get("gradeId");
        const subjectId = searchParams.get("subjectId");
        let classId = searchParams.get("classId");
        const query = searchParams.get("query");
        const studentId = searchParams.get("studentId");

        let targetGradeId = gradeId;
        let targetClassId = classId;


        // Role-based Access & Auto-filtering
        if (studentId) {
            // Check authorization for viewing specific student's books
            let isAuthorized = false;
            if (dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN') {
                isAuthorized = true; // School-wide access handled by where.schoolId
            } else if (dbUser.role === 'PARENT') {
                if (!prisma) {
                    const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
                    const supabaseAdmin = createSupabaseAdmin(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    const { data: link } = await supabaseAdmin
                        .from('ParentStudentLink')
                        .select('id')
                        .eq('parentId', dbUser.id)
                        .eq('studentId', studentId)
                        .maybeSingle();
                    if (link) isAuthorized = true;
                } else {
                    const link = await prisma.parentStudentLink.findFirst({
                        where: { parentId: dbUser.id, studentId: studentId }
                    });
                    if (link) isAuthorized = true;
                }
            } else if (dbUser.role === 'TEACHER') {
                isAuthorized = true;
            }

            if (!isAuthorized) return new NextResponse("Forbidden", { status: 403 });

            if (!prisma) {
                const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
                const supabaseAdmin = createSupabaseAdmin(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                const { data: student } = await supabaseAdmin
                    .from('Student')
                    .select('gradeId, classId')
                    .eq('id', studentId)
                    .maybeSingle();
                if (student) {
                    targetGradeId = student.gradeId;
                    targetClassId = student.classId;
                }
            } else {
                const student = await prisma.student.findUnique({
                    where: { id: studentId },
                    select: { gradeId: true, classId: true }
                });
                if (student) {
                    targetGradeId = student.gradeId;
                    targetClassId = student.classId;
                }
            }
        }

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch relations for mapping
            const [gradesRes, subjectsRes, classesRes, prerequisitesRes] = await Promise.all([
                supabaseAdmin.from('Grade').select('*').eq('schoolId', dbUser.schoolId),
                supabaseAdmin.from('Subject').select('*').eq('schoolId', dbUser.schoolId),
                supabaseAdmin.from('Class').select('*'),
                supabaseAdmin.from('Book').select('*').eq('schoolId', dbUser.schoolId)
            ]);

            const gradeMap = new Map((gradesRes.data || []).map((g: any) => [g.id, g]));
            const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s]));
            const classMap = new Map((classesRes.data || []).map((c: any) => [c.id, c]));
            const bookMap = new Map((prerequisitesRes.data || []).map((b: any) => [b.id, b]));

            let supabaseQuery = supabaseAdmin
                .from('Book')
                .select('*')
                .eq('schoolId', dbUser.schoolId)
                .order('createdAt', { ascending: false });

            if (targetGradeId) supabaseQuery = supabaseQuery.eq('gradeId', targetGradeId);
            if (targetClassId) supabaseQuery = supabaseQuery.eq('classId', targetClassId);
            if (subjectId) supabaseQuery = supabaseQuery.eq('subjectId', subjectId);

            const { data: booksData, error } = await supabaseQuery;
            if (error) throw error;

            const now = new Date();
            const books = (booksData || []).map((b: any) => {
                if (dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN' && b.expiresAt) {
                    if (new Date(b.expiresAt) <= now) return null;
                }

                if (query) {
                    const q = query.toLowerCase();
                    const matchesTitle = b.title?.toLowerCase().includes(q);
                    const matchesAuthor = b.author?.toLowerCase().includes(q);
                    const matchesDesc = b.description?.toLowerCase().includes(q);
                    if (!matchesTitle && !matchesAuthor && !matchesDesc) return null;
                }

                return {
                    ...b,
                    grade: gradeMap.get(b.gradeId) || null,
                    subject: subjectMap.get(b.subjectId) || null,
                    class: classMap.get(b.classId) || null,
                    prerequisite: b.prerequisiteId ? bookMap.get(b.prerequisiteId) : null
                };
            }).filter(Boolean);

            return NextResponse.json(books);
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where = {
            schoolId: dbUser.schoolId,
            ...(targetGradeId && { gradeId: targetGradeId }),
            ...(targetClassId && { classId: targetClassId }),
            ...(subjectId && { subjectId }),
            ...(query && {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { author: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            }),
            // Optionally filter out expired for non-principals
            ...(dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN' && {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            })
        };

        const [books, total] = await Promise.all([
            prisma.book.findMany({
                where,
                skip,
                take: limit,
                include: {
                    grade: true,
                    subject: true,
                    class: true,
                    prerequisite: true // For UI check
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.book.count({ where })
        ]);

        return NextResponse.json({
            books,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json() as any;
        const {
            title,
            fileUrl,
            gradeId,
            classId,
            subjectId,
            author,
            academicYear,
            edition,
            description,
            teacherNote,
            expiresAt,
            prerequisiteId
        } = body;

        if (!title || !fileUrl || !gradeId || !classId || !subjectId) {
            return new NextResponse("Missing mandatory fields (Title, File, Grade, Section, Subject)", { status: 400 });
        }

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch references
            const [gradeRes, classRes, subjectRes] = await Promise.all([
                supabaseAdmin.from('Grade').select('schoolId').eq('id', gradeId).maybeSingle(),
                supabaseAdmin.from('Class').select('*, grade:Grade(schoolId)').eq('id', classId).maybeSingle(),
                supabaseAdmin.from('Subject').select('schoolId').eq('id', subjectId).maybeSingle()
            ]);

            const grade = gradeRes.data;
            const cls = classRes.data;
            const subject = subjectRes.data;

            if (grade?.schoolId !== dbUser.schoolId || cls?.grade?.schoolId !== dbUser.schoolId || subject?.schoolId !== dbUser.schoolId) {
                return new NextResponse("Forbidden: Cross-tenant reference", { status: 403 });
            }

            // Duplicate Check
            const { data: existing } = await supabaseAdmin
                .from('Book')
                .select('id')
                .eq('schoolId', dbUser.schoolId)
                .eq('gradeId', gradeId)
                .eq('subjectId', subjectId)
                .eq('classId', classId)
                .ilike('title', title)
                .maybeSingle();

            if (existing) {
                return new NextResponse("Book with this title already exists for this section and subject", { status: 409 });
            }

            const { data: book, error } = await supabaseAdmin
                .from('Book')
                .insert({
                    schoolId: dbUser.schoolId,
                    gradeId,
                    classId,
                    subjectId,
                    title,
                    fileUrl,
                    author,
                    academicYear,
                    edition,
                    description,
                    teacherNote,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    prerequisiteId: prerequisiteId || null
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(book);
        }

        // Tenant Isolation: Verify foreign keys belong to this school
        const [grade, cls, subject] = await Promise.all([
            prisma.grade.findUnique({ where: { id: gradeId }, select: { schoolId: true } }),
            prisma.class.findUnique({ where: { id: classId }, select: { grade: { select: { schoolId: true } } } }),
            prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } })
        ]);

        if (grade?.schoolId !== dbUser.schoolId || cls?.grade.schoolId !== dbUser.schoolId || subject?.schoolId !== dbUser.schoolId) {
            return new NextResponse("Forbidden: Cross-tenant reference", { status: 403 });
        }

        // Duplicate Check: Grade + Subject + Class Section + Book Title
        const existing = await prisma.book.findFirst({
            where: {
                schoolId: dbUser.schoolId,
                gradeId,
                subjectId,
                classId,
                title: { equals: title, mode: 'insensitive' }
            }
        });

        if (existing) {
            return new NextResponse("Book with this title already exists for this section and subject", { status: 409 });
        }

        const book = await prisma.book.create({
            data: {
                schoolId: dbUser.schoolId,
                gradeId,
                classId,
                subjectId,
                title,
                fileUrl,
                author,
                academicYear,
                edition,
                description,
                teacherNote,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                prerequisiteId: prerequisiteId || null
            }
        });

        return NextResponse.json(book);
    } catch (e) {
        return handleApiError(e);
    }
}
