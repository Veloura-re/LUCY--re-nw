import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, requireRole, handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(request.url);
        const gradeId = searchParams.get('gradeId');

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            if (gradeId) {
                const { data: classesData, error } = await supabaseAdmin
                    .from('Class')
                    .select('id, name, grade:Grade(schoolId)')
                    .eq('gradeId', gradeId);
                if (error) throw error;

                const classes = (classesData || [])
                    .filter((c: any) => c.grade?.schoolId === dbUser.schoolId)
                    .map((c: any) => ({ id: c.id, name: c.name }));

                return NextResponse.json({ classes });
            }

            // Full nested response
            const { data: gradesData, error: gErr } = await supabaseAdmin
                .from('Grade')
                .select('*')
                .eq('schoolId', dbUser.schoolId)
                .order('level', { ascending: true });
            if (gErr) throw gErr;

            // Fetch classes, teachers, student counts
            const { data: classesData, error: cErr } = await supabaseAdmin
                .from('Class')
                .select('*, homeroomTeacher:User(id, name, email), students:Student(id)');
            if (cErr) throw cErr;

            const classMap = new Map<string, any[]>();
            for (const c of (classesData || [])) {
                if (!classMap.has(c.gradeId)) {
                    classMap.set(c.gradeId, []);
                }
                classMap.get(c.gradeId)!.push({
                    id: c.id,
                    name: c.name,
                    gradeId: c.gradeId,
                    homeroomTeacherId: c.homeroomTeacherId,
                    homeroomTeacher: c.homeroomTeacher,
                    _count: { students: c.students?.length || 0 }
                });
            }

            const grades = (gradesData || []).map((g: any) => {
                const classes = classMap.get(g.id) || [];
                classes.sort((a, b) => a.name.localeCompare(b.name));
                return {
                    ...g,
                    classes
                };
            });

            return NextResponse.json({ grades });
        }

        // If gradeId is given, return flat classes for that grade (for dropdowns)
        if (gradeId) {
            const classes = await prisma.class.findMany({
                where: { gradeId, grade: { schoolId: dbUser.schoolId } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json({ classes });
        }

        // Full nested response
        const grades = await prisma.grade.findMany({
            where: { schoolId: dbUser.schoolId },
            include: {
                classes: {
                    include: {
                        homeroomTeacher: { select: { id: true, name: true, email: true } },
                        _count: { select: { students: true } }
                    },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { level: 'asc' }
        });

        return NextResponse.json({ grades });
    } catch (e) {
        return handleApiError(e);
    }
}


export async function PATCH(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { classId: string, homeroomTeacherId: string | null };
        const { classId, homeroomTeacherId } = body;

        // Ensure the class belongs to this school
        const targetClass = await prisma.class.findUnique({
            where: { id: classId },
            include: { grade: true }
        });

        if (!targetClass || targetClass.grade.schoolId !== dbUser.schoolId) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        const updatedClass = await prisma.class.update({
            where: { id: classId },
            data: { homeroomTeacherId }
        });

        // Role Transition Logic:
        if (homeroomTeacherId) {
            await prisma.user.update({
                where: { id: homeroomTeacherId },
                data: { role: 'HOMEROOM' }
            });
        }

        // Cleanup: Any user with HOMEROOM role in this school who is NOT a homeroom teacher anymore
        const activeHomeroomTeachers = await prisma.class.findMany({
            where: {
                NOT: { homeroomTeacherId: null },
                grade: { schoolId: dbUser.schoolId }
            },
            select: { homeroomTeacherId: true }
        });
        const activeIds = new Set(activeHomeroomTeachers.map(c => (c.homeroomTeacherId as string)));

        const teachersToRevert = await prisma.user.findMany({
            where: {
                role: 'HOMEROOM',
                schoolId: dbUser.schoolId,
                id: { notIn: Array.from(activeIds) }
            }
        });

        for (const teacher of teachersToRevert) {
            await prisma.user.update({
                where: { id: teacher.id },
                data: { role: 'TEACHER' }
            });
        }

        // Invalidate Structure Caches
        revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'class', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, class: updatedClass });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { type: string, name: string, level: string, gradeId: string, schoolId?: string };
        const { type, name, level, gradeId } = body;

        if (type === 'GRADE') {
            // When SUPERADMIN deploys a grade, they should supply a schoolId in the body, otherwise fallback to their dbUser.schoolId
            const targetSchoolId = dbUser.role === 'SUPERADMIN' && body.schoolId ? body.schoolId : dbUser.schoolId!;
            
            const grade = await prisma.grade.create({
                data: {
                    schoolId: targetSchoolId,
                    name,
                    level: parseInt(level),
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, targetSchoolId), 'max');
            
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'class', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ grade });
        } else if (type === 'CLASS') {
            const parentGrade = await prisma.grade.findUnique({ where: { id: gradeId } });
            if (!parentGrade || (parentGrade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const cls = await prisma.class.create({
                data: {
                    gradeId,
                    name,
                }
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
            return NextResponse.json({ cls });
        }
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        const body = await request.json() as { id: string, type: string };
        const { id, type } = body;

        if (type === 'CLASS') {
            const targetClass = await prisma.class.findUnique({ where: { id }, include: { grade: true } });
            if (!targetClass || (targetClass.grade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                await tx.teacherAssignment.deleteMany({ where: { classId: id } });
                await tx.timetable.deleteMany({ where: { classId: id } });
                await tx.exam.deleteMany({ where: { classId: id } });
                await tx.lesson.deleteMany({ where: { classId: id } });
                await tx.student.updateMany({ where: { classId: id }, data: { classId: null } });
                await tx.class.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else if (type === 'GRADE') {
            const targetGrade = await prisma.grade.findUnique({ where: { id } });
            if (!targetGrade || (targetGrade.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.$transaction(async (tx) => {
                // Cascading deletes usually handled by DB, but here we do it explicitly for complex links
                await tx.parentStudentLink.deleteMany({ where: { student: { gradeId: id } } });
                await tx.attendanceRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.gradeRecord.deleteMany({ where: { student: { gradeId: id } } });
                await tx.examAttempt.deleteMany({ where: { student: { gradeId: id } } });
                await tx.student.deleteMany({ where: { gradeId: id } });
                await tx.class.deleteMany({ where: { gradeId: id } });
                await tx.grade.delete({ where: { id } });
            });
            revalidateTag(getSchoolTag(CACHE_TAGS.GRADES, dbUser.schoolId!), 'max');
            revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, dbUser.schoolId!), 'max');
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = dbUser?.id || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'class', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
