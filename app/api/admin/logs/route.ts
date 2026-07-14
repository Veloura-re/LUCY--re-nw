import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (!dbUser || dbUser.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const resourceType = searchParams.get('resourceType') || '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
        where.OR = [
            { action: { contains: search, mode: 'insensitive' } },
            { resourceType: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
    }
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resourceType) where.resourceType = resourceType;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } }
            }
        }),
        prisma.auditLog.count({ where })
    ]);

    // Stats for top section
    const stats = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 5
    });

    return NextResponse.json({ logs, total, page, limit, stats });
}
