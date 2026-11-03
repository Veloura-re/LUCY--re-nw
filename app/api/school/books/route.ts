import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, requireRole, handleApiError, clampLimit, clampPage } from '@/lib/security';
import { withAudit } from '@/lib/with-audit';

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // A platform superadmin has no school of their own, so there is nothing to list.
        if (!dbUser.schoolId) {
            return NextResponse.json({ books: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
        }

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
            let isAuthorized = false;
            if (dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN' || dbUser.role === 'OWNER') {
                isAuthorized = true;
            } else if (dbUser.role === 'PARENT') {
                const link = await prisma.parentStudentLink.findFirst({
                    where: { parentId: dbUser.id, studentId: studentId }
                });
                if (link) isAuthorized = true;
            } else if (dbUser.role === 'TEACHER') {
                isAuthorized = true;
            }

            if (!isAuthorized) return new NextResponse("Forbidden", { status: 403 });

            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { gradeId: true, classId: true }
            });
            if (student) {
                targetGradeId = student.gradeId;
                targetClassId = student.classId;
            }
        }

        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 50);
        const skip = (page - 1) * limit;

        const where: any = {
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
            ...(dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN' && dbUser.role !== 'OWNER' && {
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
                    prerequisite: true
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

async function handlePOST(req: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = (await req.json().catch(() => ({}))) as any;
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

export const POST = withAudit(handlePOST, { action: 'CREATE_BOOK', resourceType: 'book' });
