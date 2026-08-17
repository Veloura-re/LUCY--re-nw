import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const status = searchParams.get('status') as any;

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

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

            const validStudentIds = (studentsRes.data || []).map((s: any) => s.id);
            const validUserIds = (usersRes.data || []).map((u: any) => u.id);

            let query = supabaseAdmin
                .from('AbsenceAuthorization')
                .select('*')
                .order('createdAt', { ascending: false });

            if (dbUser.role !== 'SUPERADMIN') {
                if (validStudentIds.length === 0 && validUserIds.length === 0) {
                    return NextResponse.json({ authorizations: [] });
                }
                const filterParts = [];
                if (validStudentIds.length > 0) filterParts.push(`studentId.in.(${validStudentIds.join(',')})`);
                if (validUserIds.length > 0) {
                    filterParts.push(`requestorId.in.(${validUserIds.join(',')})`);
                    filterParts.push(`userId.in.(${validUserIds.join(',')})`);
                }
                query = query.or(filterParts.join(','));
            }

            if (status) {
                query = query.eq('status', status);
            }
            if (studentId) {
                query = query.eq('studentId', studentId);
            }

            const { data: authData, error } = await query;
            if (error) throw error;

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
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId;

        const body = await request.json() as { id?: string; status?: string };
        const { id, status } = body;

        if (!id || !status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({ error: 'Valid ID and Status required (APPROVED, REJECTED, PENDING)' }, { status: 400 });
        }

        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            // Verify tenant ownership first
            const { data: existingAuth, error: fetchErr } = await (supabaseAdmin as any)
                .from('AbsenceAuthorization')
                .select('*, student:Student(schoolId), user:User(schoolId)')
                .eq('id', id)
                .single();

            if (fetchErr || !existingAuth) {
                return NextResponse.json({ error: 'Authorization not found' }, { status: 404 });
            }

            if (dbUser.role !== 'SUPERADMIN') {
                const belongs = existingAuth.student?.schoolId === schoolId || existingAuth.user?.schoolId === schoolId;
                if (!belongs) {
                    return NextResponse.json({ error: 'Forbidden: Authorization belongs to another school' }, { status: 403 });
                }
            }

            const { data: auth, error } = await (supabaseAdmin as any)
                .from('AbsenceAuthorization')
                .update({ status })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            
            // Invalidate cache
            if (schoolId) {
                try {
                    const { revalidateTag } = await import('next/cache');
                    const { CACHE_TAGS, getSchoolTag } = await import('@/lib/cache-keys');
                    revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, schoolId), 'max');
                } catch { /* non-blocking */ }
            }

            return NextResponse.json({ id: auth.id, status: auth.status });
        }

        // 1. Verify Tenant Scoping
        const existing = await (prisma as any).absenceAuthorization.findFirst({
            where: {
                id,
                ...(dbUser.role === 'SUPERADMIN' ? {} : {
                    OR: [
                        { student: { schoolId: schoolId! } },
                        { user: { schoolId: schoolId! } },
                        { requestor: { schoolId: schoolId! } }
                    ]
                })
            },
            include: { student: true, user: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Authorization not found in your school' }, { status: 404 });
        }

        // 2. Perform atomic update + retroactive attendance sync
        const authorization = await (prisma as any).$transaction(async (tx: any) => {
            const updated = await tx.absenceAuthorization.update({
                where: { id },
                data: { status }
            });

            // If approved and attached to a student, retroactively mark overlapping absences as EXCUSED
            if (status === 'APPROVED' && existing.studentId) {
                await tx.attendanceRecord.updateMany({
                    where: {
                        studentId: existing.studentId,
                        date: {
                            gte: new Date(existing.startDate),
                            lte: new Date(existing.endDate)
                        },
                        status: 'ABSENT'
                    },
                    data: {
                        status: 'EXCUSED',
                        reason: `Excused via Authorization #${id.substring(0, 8)}`
                    }
                });
            }

            return updated;
        });

        // 3. Invalidate attendance cache
        if (schoolId) {
            try {
                const { revalidateTag } = await import('next/cache');
                const { CACHE_TAGS, getSchoolTag } = await import('@/lib/cache-keys');
                revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, schoolId), 'max');
            } catch { /* non-blocking */ }
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, action: 'UPDATE', resourceType: 'authorization', ip: _ip });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ authorization });
    } catch (e) {
        return handleApiError(e);
    }
}
