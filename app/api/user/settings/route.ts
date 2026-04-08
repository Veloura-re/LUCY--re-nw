import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/security';

export async function GET() {
    try {
        const dbUser = await requireAuth();

        const user = await prisma.user.findUnique({
            where: { id: dbUser.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                bio: true,
                preferences: true,
                // Include linked students for Parents
                parentLinks: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                studentCode: true,
                                grade: { select: { name: true } },
                                class: { select: { name: true } }
                            }
                        }
                    }
                },
                // Include assignments for Teachers
                teacherAssignments: {
                    include: {
                        class: { select: { name: true, grade: { select: { name: true } } } },
                        subject: { select: { name: true } }
                    }
                }
            }
        });

        return NextResponse.json({ user });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const dbUser = await requireAuth();
        const { name, bio, preferences } = await request.json();

        const user = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                name,
                bio,
                preferences
            }
        });

        return NextResponse.json({ user });
    } catch (e) {
        return handleApiError(e);
    }
}
