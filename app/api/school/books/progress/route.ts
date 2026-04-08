import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError } from "@/lib/security";

export async function POST(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const body = await req.json();
        const { bookId, completed, studentId } = body;

        if (!bookId) return NextResponse.json({ error: "Book ID required" }, { status: 400 });

        let targetUserId = dbUser.id;

        if (studentId) {
            if (dbUser.role === 'PARENT') {
                const link = await prisma.parentStudentLink.findFirst({
                    where: { parentId: dbUser.id, studentId: studentId },
                    include: { student: true }
                });
                if (!link) return NextResponse.json({ error: "Forbidden - Not your child" }, { status: 403 });
                if (!link.student.userId) return NextResponse.json({ error: "Student account not active" }, { status: 400 });
                targetUserId = link.student.userId;
            } else if (!['PRINCIPAL', 'SUPERADMIN'].includes(dbUser.role)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            } else {
                // Admin can update anyone? Need to find student's userId
                const student = await prisma.student.findUnique({
                    where: { id: studentId, schoolId: dbUser.schoolId! },
                    select: { userId: true }
                });
                if (!student?.userId) return NextResponse.json({ error: "Target student user not found or not in your school" }, { status: 404 });
                targetUserId = student.userId;
            }
        }

        const progress = await prisma.resourceProgress.upsert({
            where: {
                userId_bookId: {
                    userId: targetUserId,
                    bookId: bookId
                }
            },
            update: { completed: !!completed },
            create: {
                userId: targetUserId,
                bookId: bookId,
                completed: !!completed
            }
        });

        return NextResponse.json(progress);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        let targetUserId = dbUser.id;

        if (studentId) {
            if (dbUser.role === 'PARENT') {
                const link = await prisma.parentStudentLink.findFirst({
                    where: { parentId: dbUser.id, studentId: studentId },
                    include: { student: true }
                });
                if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                if (link.student.userId) targetUserId = link.student.userId;
            } else if (['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM'].includes(dbUser.role)) {
                const student = await prisma.student.findUnique({
                    where: { id: studentId, schoolId: dbUser.schoolId! },
                    select: { userId: true }
                });
                if (student?.userId) targetUserId = student.userId;
            }
        }

        const progress = await prisma.resourceProgress.findMany({
            where: { userId: targetUserId }
        });

        return NextResponse.json(progress);
    } catch (error) {
        return handleApiError(error);
    }
}
