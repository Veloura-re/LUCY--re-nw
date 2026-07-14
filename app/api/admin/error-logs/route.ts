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
    const type = searchParams.get('type') || '';
    const level = searchParams.get('level') || '';
    const skip = (page - 1) * limit;

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

    const db = prisma as any;
    const [errors, total, typeStats] = await Promise.all([
        db.errorLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                school: { select: { id: true, name: true, schoolCode: true } }
            }
        }),
        db.errorLog.count({ where }),
        db.errorLog.groupBy({
            by: ['type'],
            _count: { type: true },
            orderBy: { _count: { type: 'desc' } }
        })
    ]);

    return NextResponse.json({ errors, total, page, limit, typeStats });
}
