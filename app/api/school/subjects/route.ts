import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

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
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { name } = await request.json();

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
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { id } = await request.json();

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
