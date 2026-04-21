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

        const books = await prisma.book.findMany({
            where: {
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
            },
            include: {
                grade: true,
                subject: true,
                class: true,
                prerequisite: true // For UI check
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(books);
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const body = await req.json();
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
