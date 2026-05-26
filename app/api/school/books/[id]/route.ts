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

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: book } = await supabaseAdmin
                .from('Book')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (!book || book.schoolId !== dbUser.schoolId) {
                return new NextResponse("Book not found", { status: 404 });
            }

            const { data: updatedBook, error } = await supabaseAdmin
                .from('Book')
                .update({ ...body })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(updatedBook);
        }

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

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: book } = await supabaseAdmin
                .from('Book')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (!book || book.schoolId !== dbUser.schoolId) {
                return new NextResponse("Book not found", { status: 404 });
            }

            // Programmatically resolve potential cascade deletion blocks
            await Promise.all([
                supabaseAdmin.from('ResourceProgress').delete().eq('bookId', id),
                supabaseAdmin.from('UnitPackResource').delete().eq('bookId', id)
            ]);

            const { error } = await supabaseAdmin
                .from('Book')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return new NextResponse("Book deleted", { status: 200 });
        }

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
