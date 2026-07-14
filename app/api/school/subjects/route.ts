import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: subjects, error } = await supabaseAdmin
                .from('Subject')
                .select('*')
                .eq('schoolId', dbUser.schoolId!)
                .order('name', { ascending: true });
            if (error) throw error;
            return NextResponse.json({ subjects });
        }

        const subjects = await prisma.subject.findMany({
            where: { schoolId: dbUser.schoolId! },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ subjects });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { name } = await request.json();

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: subject, error } = await supabaseAdmin
                .from('Subject')
                .insert({
                    schoolId: dbUser.schoolId!,
                    name
                })
                .select()
                .single();
            if (error) throw error;
            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'subject', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ subject });
        }

        const subject = await prisma.subject.create({
            data: {
                schoolId: dbUser.schoolId!,
                name
            }
        });

        // Trigger Cache Invalidation
        revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');

        return NextResponse.json({ subject });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { id } = await request.json();

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const { data: subjectToDelete } = await supabaseAdmin
                .from('Subject')
                .select('schoolId')
                .eq('id', id)
                .maybeSingle();

            if (subjectToDelete?.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const { error } = await supabaseAdmin
                .from('Subject')
                .delete()
                .eq('id', id);
            if (error) throw error;

            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'subject', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
        }

        // Tenant Isolation: Ensure the subject being deleted actually belongs to this school
        const subjectToDelete = await prisma.subject.findUnique({ where: { id } });
        if (subjectToDelete?.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.subject.delete({ where: { id } });

        // Trigger Cache Invalidation
        revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
