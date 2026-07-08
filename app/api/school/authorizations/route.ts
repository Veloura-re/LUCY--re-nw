import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const status = searchParams.get('status') as any;

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            let query = supabaseAdmin
                .from('AbsenceAuthorization')
                .select('*')
                .order('createdAt', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }
            if (studentId) {
                query = query.eq('studentId', studentId);
            }

            const { data: authData, error } = await query;
            if (error) throw error;

            // Fetch students and users in this school for mapping
            const [studentsRes, usersRes] = await Promise.all([
                supabaseAdmin
                    .from('Student')
                    .select('id, firstName, lastName, studentCode, schoolId')
                    .eq('schoolId', dbUser.schoolId),
                supabaseAdmin
                    .from('User')
                    .select('id, name, email, role, schoolId')
                    .eq('schoolId', dbUser.schoolId)
            ]);

            const studentMap = new Map((studentsRes.data || []).map((s: any) => [s.id, s]));
            const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));

            const authorizations = (authData || []).map((auth: any) => {
                const student = auth.studentId ? studentMap.get(auth.studentId) as any : null;
                const user = auth.userId ? userMap.get(auth.userId) as any : null;
                const requestor = auth.requestorId ? userMap.get(auth.requestorId) as any : null;

                const belongsToSchool =
                    (student && student.schoolId === dbUser.schoolId) ||
                    (user && user.schoolId === dbUser.schoolId) ||
                    (requestor && requestor.schoolId === dbUser.schoolId);

                if (!belongsToSchool) return null;

                return {
                    ...auth,
                    student,
                    user,
                    requestor
                };
            }).filter(Boolean);

            return NextResponse.json({ authorizations });
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const where = {
            OR: [
                { student: { schoolId: dbUser.schoolId! } },
                { user: { schoolId: dbUser.schoolId! } },
                { requestor: { schoolId: dbUser.schoolId! } }
            ],
            ...(studentId ? { studentId } : {}),
            ...(status ? { status } : {}),
        };

        const [authorizations, total] = await Promise.all([
            (prisma as any).absenceAuthorization.findMany({
                where,
                skip,
                take: limit,
                include: {
                    student: {
                        select: { firstName: true, lastName: true, studentCode: true }
                    },
                    user: {
                        select: { name: true, email: true, role: true }
                    },
                    requestor: {
                        select: { name: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            (prisma as any).absenceAuthorization.count({ where })
        ]);

        return NextResponse.json({
            authorizations,
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

export async function PATCH(request: Request) {
    try {
        // Only Staff can approve
        const dbUser = await requireRole(['PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN']);

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID and Status required' }, { status: 400 });
        }

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: auth, error } = await (supabaseAdmin as any)
                .from('AbsenceAuthorization')
                .update({ status })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ id: auth.id, status: auth.status });
        }

        const authorization = await (prisma as any).absenceAuthorization.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({ authorization });
    } catch (e) {
        return handleApiError(e);
    }
}
