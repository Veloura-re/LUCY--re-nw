import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['STUDENT', 'TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN']);

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: book, error } = await supabaseAdmin
                .from('Book')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            if (!book || book.schoolId !== dbUser.schoolId) {
                return new NextResponse("Book not found", { status: 404 });
            }
            return NextResponse.json(book);
        }

        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                class: true,
                grade: true,
                subject: true
            }
        });

        if (!book || book.schoolId !== dbUser.schoolId) {
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

        // Clean up dependencies and self-referencing prerequisites
        await prisma.book.updateMany({
            where: { prerequisiteId: id },
            data: { prerequisiteId: null }
        });
        await prisma.resourceProgress.deleteMany({ where: { bookId: id } });
        await prisma.unitPackResource.deleteMany({ where: { bookId: id } });
        await prisma.bookRequest.deleteMany({ where: { schoolId: book.schoolId } });

        await prisma.book.delete({
            where: { id }
        });

        return new NextResponse("Book deleted", { status: 200 });
    } catch (e) {
        return handleApiError(e);
    }
}
