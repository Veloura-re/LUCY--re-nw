import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const body = await req.json();
        const book = await prisma.book.findUnique({
            where: { id }
        });

        if (!book || book.schoolId !== dbUser.schoolId) {
            return new NextResponse("Book not found", { status: 404 });
        }

        const updatedBook = await prisma.book.update({
            where: { id },
            data: { ...body }
        });

        return NextResponse.json(updatedBook);
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
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const book = await prisma.book.findUnique({
            where: { id }
        });

        if (!book || book.schoolId !== dbUser.schoolId) {
            return new NextResponse("Book not found", { status: 404 });
        }

        await prisma.book.delete({
            where: { id }
        });

        return new NextResponse("Book deleted", { status: 200 });
    } catch (e) {
        return handleApiError(e);
    }
}
