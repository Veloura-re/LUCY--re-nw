import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PARENT']);
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!dbUser.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Fetch teachers and principals in the same school
        const staff = await prisma.user.findMany({
            where: {
                schoolId: dbUser.schoolId,
                role: { in: [Role.TEACHER, Role.HOMEROOM, Role.PRINCIPAL] },
                ...(query ? {
                    name: {
                        contains: query,
                        mode: 'insensitive'
                    }
                } : {})
            },
            select: {
                id: true,
                name: true,
                role: true,
                bio: true
            },
            take: 20
        });

        return NextResponse.json({ staff });
    } catch (e) {
        return handleApiError(e);
    }
}
