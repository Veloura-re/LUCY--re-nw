import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';
        const skip = (page - 1) * limit;

        const where: any = {
            schoolId: dbUser.schoolId,
            OR: [
                { targetRole: null },
                { targetRole: dbUser.role }
            ]
        };

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where,
                skip,
                take: limit,
                orderBy: { eventDate: 'asc' },
                include: { createdBy: { select: { name: true, role: true } } }
            }),
            prisma.event.count({ where })
        ]);

        return NextResponse.json({
            events,
            userRole: dbUser.role,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        // Only Principal can manage events (exclusion of Superadmin/Teacher/Parent/Student per request)
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { title, description, date, targetRole } = (await request.json()) as any;

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

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'event', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ event });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Tenant Isolation: Ensure the event being deleted actually belongs to this school
        const eventToDelete = await prisma.event.findUnique({ where: { id } });
        if (eventToDelete?.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.event.delete({ where: { id } });
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'event', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
