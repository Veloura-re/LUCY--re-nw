import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Fetch remaining (future) events
        const events = await prisma.event.findMany({
            where: {
                schoolId: dbUser.schoolId,
                OR: [
                    { targetRole: null },
                    { targetRole: dbUser.role }
                ]
            } as any,
            orderBy: { eventDate: 'asc' },
            include: { createdBy: { select: { name: true, role: true } } }
        });

        return NextResponse.json({
            events,
            userRole: dbUser.role
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        // Only Principal can manage events (exclusion of Superadmin/Teacher/Parent/Student per request)
        const dbUser = await requireRole(['PRINCIPAL']);

        const { title, description, date, targetRole } = await request.json();

        const event = await prisma.event.create({
            data: {
                title,
                description,
                eventDate: new Date(date),
                schoolId: dbUser.schoolId,
                createdById: dbUser.id,   // Ensure creator ID matches current user
                targetRole
            } as any
        });

        return NextResponse.json({ event });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL']);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Tenant Isolation: Ensure the event being deleted actually belongs to this school
        const eventToDelete = await prisma.event.findUnique({ where: { id } });
        if (eventToDelete?.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.event.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
