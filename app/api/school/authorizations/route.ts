import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSchoolLinked, handleApiError, clampLimit, clampPage } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const status = searchParams.get('status') as any;

        const page = clampPage(searchParams.get('page'));
        const limit = clampLimit(searchParams.get('limit'), 50);
        const skip = (page - 1) * limit;

        // Leadership and teaching staff see the whole school. Families see only their own requests and
        // linked children; students see their own. Finance and records staff have no use for absence notes.
        const STAFF_VIEW = ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM'];
        let scope: any[];
        if (STAFF_VIEW.includes(dbUser.role)) {
            scope = [
                { student: { schoolId: dbUser.schoolId! } },
                { user: { schoolId: dbUser.schoolId! } },
                { requestor: { schoolId: dbUser.schoolId! } }
            ];
        } else if (dbUser.role === 'PARENT') {
            scope = [{ requestorId: dbUser.id }, { student: { parentLinks: { some: { parentId: dbUser.id } } } }];
        } else if (dbUser.role === 'STUDENT') {
            scope = [{ userId: dbUser.id }, { requestorId: dbUser.id }, { student: { userId: dbUser.id } }];
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const where = {
            OR: scope,
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
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM', 'SUPERADMIN']);
        const schoolId = dbUser.schoolId;

        const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
        const { id, status } = body;

        if (!id || !status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({ error: 'Valid ID and Status required (APPROVED, REJECTED, PENDING)' }, { status: 400 });
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
                revalidateTag(getSchoolTag(CACHE_TAGS.SCHOOL_ATTENDANCE, schoolId), 'max');
            } catch { /* non-blocking */ }
        }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: dbUser.schoolId, action: 'UPDATE_AUTHORIZATION', resourceType: 'authorization', ip: _ip });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ authorization });
    } catch (e) {
        return handleApiError(e);
    }
}
