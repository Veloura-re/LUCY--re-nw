import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin, parsePaging, parseSince } from '@/lib/admin-auth';

export async function GET(request: Request) {
    const admin = await verifySuperAdmin();
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaging(searchParams);
    const search = (searchParams.get('search') || '').slice(0, 200);
    const schoolId = searchParams.get('schoolId') || '';
    const type = searchParams.get('type') || '';
    const level = searchParams.get('level') || '';
    const since = parseSince(searchParams.get('since'));
    const grouped = searchParams.get('group') === '1';

    const where: any = {};
    if (search) {
        where.OR = [
            { message: { contains: search, mode: 'insensitive' } },
            { path: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (schoolId) where.schoolId = schoolId;
    if (type) where.type = type;
    if (level) where.level = level;
    if (since) where.createdAt = { gte: since };

    const db = prisma as any;
    const dayAgo = new Date(Date.now() - 24 * 3600e3);

    // The same failure repeated hundreds of times is one problem; grouping shows it once with a count
    const groupsPromise = grouped
        ? db.errorLog.groupBy({
            by: ['type', 'message', 'path'],
            where,
            _count: { _all: true },
            _max: { createdAt: true },
            _min: { createdAt: true },
            orderBy: { _max: { createdAt: 'desc' } },
            take: limit,
            skip,
        })
        : Promise.resolve(null);

    const [errors, total, typeStats, groups, errors24h, warnings24h] = await Promise.all([
        grouped ? Promise.resolve([]) : db.errorLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { school: { select: { id: true, name: true, schoolCode: true } } },
        }),
        db.errorLog.count({ where }),
        db.errorLog.groupBy({ by: ['type'], where, _count: { type: true }, orderBy: { _count: { type: 'desc' } } }),
        groupsPromise,
        db.errorLog.count({ where: { level: 'ERROR', createdAt: { gte: dayAgo } } }),
        db.errorLog.count({ where: { level: 'WARN', createdAt: { gte: dayAgo } } }),
    ]);

    return NextResponse.json({
        errors,
        groups: groups?.map((g: any) => ({
            type: g.type,
            message: g.message,
            path: g.path,
            count: g._count._all,
            firstSeen: g._min.createdAt,
            lastSeen: g._max.createdAt,
        })) ?? null,
        total, page, limit, typeStats,
        summary: { errors24h, warnings24h },
    });
}
