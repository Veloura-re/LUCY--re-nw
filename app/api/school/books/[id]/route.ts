import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['STUDENT', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN']);

        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                class: true,
                grade: true,
                subject: true
            }
        });

        if (!book || (book.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
            return new NextResponse("Book not found", { status: 404 });
        }

        return NextResponse.json(book);
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const book = await prisma.book.findUnique({
            where: { id }
        });

        if (!book || (book.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
            return new NextResponse("Book not found", { status: 404 });
        }

        // Clean up dependencies and self-referencing prerequisites atomically
        await prisma.$transaction(async (tx) => {
            await tx.book.updateMany({
                where: { prerequisiteId: id },
                data: { prerequisiteId: null }
            });
            await tx.resourceProgress.deleteMany({ where: { bookId: id } });
            await tx.unitPackResource.deleteMany({ where: { bookId: id } });
            // Only clean up requests matching this book's title for this school
            await tx.bookRequest.deleteMany({ where: { schoolId: book.schoolId, title: book.title } });

            await tx.book.delete({
                where: { id }
            });
        });

        const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
        await logActivity({
            userId: dbUser.id,
            schoolId: book.schoolId,
            action: 'DELETE_BOOK',
            resourceType: 'BOOK',
            resourceId: id,
            ip,
            before: { id: book.id, title: book.title, schoolId: book.schoolId }
        });

        return new NextResponse("Book deleted", { status: 200 });
    } catch (e) {
        return handleApiError(e);
    }
}
