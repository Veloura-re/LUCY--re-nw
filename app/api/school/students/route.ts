import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireSchoolLinked, secureJson } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';

// GET: List all students in the school
export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const classId = searchParams.get('classId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = classId ? 0 : (page - 1) * limit;
        const take = classId ? 1000 : limit;

        if (id) {
            const student = await prisma.student.findUnique({
                where: { id },
                include: { grade: true, class: true }
            });
            return NextResponse.json({ student });
        }

        const whereClause: any = { schoolId: user.schoolId };
        if (classId) {
            whereClause.classId = classId;
        }

        // We still provide a fallback for clients who haven't migrated to Server Components
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where: whereClause,
                include: {
                    grade: true,
                    class: true,
                    invoices: {
                        where: { status: { in: ['PENDING', 'OVERDUE'] } },
                        select: { amount: true }
                    }
                },
                orderBy: { lastName: 'asc' },
                skip,
                take
            }),
            prisma.student.count({ where: whereClause })
        ]);

        return NextResponse.json({ 
            students, 
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

// POST: Add a new student
export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json() as any;
        const targetSchoolId = user.schoolId;

        const {
            firstName, lastName, grade: gradeId, classId, email,
            gender, dob, address, guardianName, guardianPhone, secondaryPhone, photoUrl
        } = body;

        if (!gradeId) {
            return NextResponse.json({ error: "Grade is required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
                data: {
                    firstName,
                    lastName,
                    schoolId: targetSchoolId!,
                    gradeId: gradeId,
                    classId: classId || null,
                    email: email || null,
                    dob: dob ? new Date(dob) : null,
                    gender: gender || null,
                    address: address || null,
                    guardianName: guardianName || null,
                    guardianPhone: guardianPhone || null,
                    secondaryPhone: secondaryPhone || null,
                    photoUrl: photoUrl || null,
                    studentCode: `ST-${globalThis.crypto.randomUUID().split('-')[0].substring(0, 6).toUpperCase()}-${new Date().getFullYear()}`
                }
            });

            await logActivity({
                userId: user.id,
                action: 'CREATE_STUDENT',
                resourceType: 'STUDENT',
                resourceId: student.id,
                after: student
            });

            if (email) {
                const token = globalThis.crypto.randomUUID().replace(/-/g, '');
                await tx.inviteToken.create({
                    data: {
                        token,
                        email,
                        role: 'STUDENT',
                        schoolId: targetSchoolId!,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    }
                });
                
                // Return student and token for the response
                return { student, token };
            }

            return { student };
        });

        // Trigger Cache Invalidation (outside transaction is fine)
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, targetSchoolId!), 'max');

        if (email && result.token) {
            const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
            const inviteUrl = `${origin}/invite/${result.token}`;
            // We use the school name for the email
            const school = await prisma.school.findUnique({ where: { id: targetSchoolId! } });
            
            console.log(`📨 [STUDENTS API] Sending invite to ${email} as STUDENT for school "${school?.name}"`);
            const emailResult = await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', result.token, 'STUDENT', targetSchoolId!);
            console.log(`📨 [STUDENTS API] Invite email result:`, JSON.stringify(emailResult));
        }

        return secureJson({ student: result.student });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// PUT: Update student details
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json() as any;
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const student = await prisma.student.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                classId: data.classId || null,
                gradeId: data.gradeId,
                guardianName: data.guardianName,
                guardianPhone: data.guardianPhone,
                address: data.address,
                photoUrl: data.photoUrl,
                dob: data.dob ? new Date(data.dob) : undefined,
                gender: data.gender
            }
        });

        await logActivity({
            userId: user.id,
            action: 'UPDATE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: student.id,
            after: student
        });

        // Trigger Cache Invalidation
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!), 'max');
        revalidateTag(`student-${id}`, 'max');

        return NextResponse.json({ student });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// DELETE: Archive/Delete student
export async function DELETE(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'OWNER', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const prefs = (user.preferences as any) || {};
        const hasFullAccess = prefs?.fullAccess === true;

        if (user.role === 'PRINCIPAL' && !hasFullAccess) {
            await prisma.actionRequest.create({
                data: {
                    schoolId: user.schoolId!,
                    requesterId: user.id,
                    actionType: 'DELETE_STUDENT',
                    payload: { studentId: id },
                    status: 'PENDING'
                }
            });
            return NextResponse.json({ success: true, pendingApproval: true, message: "Deletion request sent to Owner" });
        }

        const student = await prisma.student.delete({
            where: { id, schoolId: user.schoolId! }
        });

        if (student.userId) {
            try {
                const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
                const supabaseAdmin = createSupabaseAdmin(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                await supabaseAdmin.auth.admin.deleteUser(student.userId);
                await prisma.user.delete({ where: { id: student.userId } }).catch(() => {});
            } catch (err) {
                console.error("Failed to delete user account:", err);
            }
        }

        await logActivity({
            userId: user.id,
            action: 'DELETE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: id,
            before: student
        });

        // Trigger Cache Invalidation
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!), 'max');

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return handleApiError(e);
    }
}
