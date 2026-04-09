import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireSchoolLinked } from '@/lib/security';
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

        if (id) {
            const student = await prisma.student.findUnique({
                where: { id },
                include: { grade: true, class: true }
            });
            return NextResponse.json({ student });
        }

        // We still provide a fallback for clients who haven't migrated to Server Components
        const students = await prisma.student.findMany({
            where: { schoolId: user.schoolId },
            include: {
                grade: true,
                class: true,
                invoices: {
                    where: { status: { in: ['PENDING', 'OVERDUE'] } },
                    select: { amount: true }
                }
            },
            orderBy: { lastName: 'asc' }
        });

        return NextResponse.json({ students });

    } catch (e) {
        return handleApiError(e);
    }
}

// POST: Add a new student
export async function POST(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json();
        const targetSchoolId = user.schoolId;

        const {
            firstName, lastName, grade, classId, email,
            gender, dob, address, guardianName, guardianPhone, secondaryPhone, photoUrl
        } = body;

        let gradeRecord: any;
        if (grade) {
            gradeRecord = await prisma.grade.findFirst({
                where: { schoolId: targetSchoolId!, level: parseInt(grade) || 0 }
            });
        }

        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                schoolId: targetSchoolId!,
                gradeId: gradeRecord?.id,
                classId: classId || null,
                email: email || null,
                dob: dob ? new Date(dob) : null,
                gender: gender || null,
                address: address || null,
                guardianName: guardianName || null,
                guardianPhone: guardianPhone || null,
                secondaryPhone: secondaryPhone || null,
                photoUrl: photoUrl || null,
                studentCode: `ST-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${new Date().getFullYear()}`
            }
        });

        await logActivity({
            userId: user.id,
            action: 'CREATE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: student.id,
            after: student
        });

        // Trigger Cache Invalidation for the school's students
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, targetSchoolId!));

        if (email) {
            const token = Math.random().toString(36).substring(2, 15);
            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'STUDENT',
                    schoolId: targetSchoolId!,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                }
            });
            // Email sending logic truncated for brevity
        }

        return NextResponse.json({ student });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// PUT: Update student details
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json();
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
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!));
        revalidateTag(`student-${id}`);

        return NextResponse.json({ student });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// DELETE: Archive/Delete student
export async function DELETE(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const student = await prisma.student.delete({
            where: { id, schoolId: user.schoolId! }
        });

        await logActivity({
            userId: user.id,
            action: 'DELETE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: id,
            before: student
        });

        // Trigger Cache Invalidation
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!));

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return handleApiError(e);
    }
}
