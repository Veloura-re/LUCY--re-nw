import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

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
    const schoolId = searchParams.get('schoolId') || '';
    const resourceType = searchParams.get('resourceType') || '';
    const level = searchParams.get('level') || '';
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
    if (schoolId) where.schoolId = schoolId;
    if (resourceType) where.resourceType = resourceType;
    if (level) where.level = level;

    const [logs, total, actionStats, schoolStats] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
            }
        }),
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
            by: ['action'] as any,
            _count: { action: true },
            orderBy: { _count: { action: 'desc' } },
            take: 6
        }),
        prisma.auditLog.groupBy({
            by: ['schoolId'] as any,
            _count: { schoolId: true },
            where: { schoolId: { not: null } },
            orderBy: { _count: { schoolId: 'desc' } },
            take: 10
        })
    ]);

    // Enrich schoolStats with school names
    const schoolIds = schoolStats.map(s => s.schoolId!).filter(Boolean);
    const schools = await prisma.school.findMany({
        where: { id: { in: schoolIds } },
        select: { id: true, name: true, schoolCode: true }
    });

    return NextResponse.json({ logs, total, page, limit, actionStats, schoolStats, schools });
}
