import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/security';

export async function GET() {
    try {
        const dbUser = await requireAuth();

        const user: any = await prisma.user.findUnique({
            where: { id: dbUser.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    schoolId: true,
                    bio: true,
                    preferences: true,
                    school: {
                        select: {
                            id: true,
                            name: true,
                            schoolCode: true,
                            logoUrl: true,
                            status: true,
                            subscriptionStatus: true,
                            trialEndsAt: true,
                            createdAt: true,
                            stripeCustomerId: true,
                            stripeSubscriptionId: true,
                        }
                    },
                    student: {
                        select: {
                            school: {
                                select: {
                                    id: true,
                                    name: true,
                                    schoolCode: true,
                                    logoUrl: true,
                                    status: true,
                                    subscriptionStatus: true,
                                    trialEndsAt: true,
                                    createdAt: true,
                                    stripeCustomerId: true,
                                    stripeSubscriptionId: true,
                                }
                            }
                        }
                    },
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
                                    class: { select: { name: true } },
                                    school: {
                                        select: {
                                            id: true,
                                            name: true,
                                            schoolCode: true,
                                            logoUrl: true,
                                            status: true,
                                            subscriptionStatus: true,
                                            trialEndsAt: true,
                                            createdAt: true,
                                            stripeCustomerId: true,
                                            stripeSubscriptionId: true,
                                        }
                                    }
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

            if (user && !user.school) {
                if (user.parentLinks?.length > 0 && user.parentLinks[0]?.student?.school) {
                    user.school = user.parentLinks[0].student.school;
                } else if (user.student?.school) {
                    user.school = user.student.school;
                } else if (user.role === 'SUPERADMIN') {
                    const defaultSchool = await prisma.school.findFirst({
                        select: {
                            id: true,
                            name: true,
                            schoolCode: true,
                            logoUrl: true,
                            status: true,
                            subscriptionStatus: true,
                            trialEndsAt: true,
                            createdAt: true,
                            stripeCustomerId: true,
                            stripeSubscriptionId: true,
                        },
                        orderBy: { createdAt: 'asc' }
                    });
                    if (defaultSchool) {
                        user.school = defaultSchool;
                    }
                }
            }

            return NextResponse.json({ user });
        } catch (e) {
            return handleApiError(e);
        }
    }

    export async function PATCH(request: Request) {
        try {
            const dbUser = await requireAuth();
            const { name, bio, preferences } = ((await request.json()) || {}) as any;

            const user = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    name,
                    bio,
                    preferences
                }
            });

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: dbUser.schoolId || undefined, action: 'UPDATE_SETTINGS', resourceType: 'settings', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ user });
    } catch (e) {
        return handleApiError(e);
    }
}
