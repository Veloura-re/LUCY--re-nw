import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

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
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const body = await req.json();
        const { title, description, resourceIds } = body;

        if (!title) return new NextResponse("Title required", { status: 400 });

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
