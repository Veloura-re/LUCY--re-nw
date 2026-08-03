import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/security';

export async function GET() {
    try {
        const dbUser = await requireAuth();

        let user;
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data } = await supabaseAdmin.from('User').select('*').eq('id', dbUser.id).single();
            // Simplify data for edge
            user = {
                id: data?.id,
                email: data?.email,
                name: data?.name,
                role: data?.role,
                schoolId: data?.schoolId,
                bio: data?.bio,
                preferences: data?.preferences,
                school: null,
                parentLinks: [],
                teacherAssignments: []
            };
        } else {
            user = await prisma.user.findUnique({
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
        }

        return NextResponse.json({ user });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const dbUser = await requireAuth();
        const { name, bio, preferences } = await request.json();

        let user;
        if (!prisma) {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data, error } = await supabaseAdmin
                .from('User')
                .update({ name, bio, preferences })
                .eq('id', dbUser.id)
                .select()
                .single();
            if (error) throw error;
            user = data;
        } else {
            user = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    name,
                    bio,
                    preferences
                }
            });
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE_SETTINGS', resourceType: 'settings', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ user });
    } catch (e) {
        return handleApiError(e);
    }
}
