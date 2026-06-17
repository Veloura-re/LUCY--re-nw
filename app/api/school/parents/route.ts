import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const parents = await prisma.user.findMany({
            where: {
                schoolId: dbUser.schoolId,
                role: 'PARENT'
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                parentLinks: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ parents });
    } catch (e) {
        return handleApiError(e);
    }
}
