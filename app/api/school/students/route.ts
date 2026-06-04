import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
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
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = (page - 1) * limit;

        if (id) {
            const student = await prisma.student.findUnique({
                where: { id },
                include: { grade: true, class: true }
            });
            return NextResponse.json({ student });
        }

        // We still provide a fallback for clients who haven't migrated to Server Components
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where: { schoolId: user.schoolId },
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
                take: limit
            }),
            prisma.student.count({ where: { schoolId: user.schoolId } })
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
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json() as any;
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

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
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
                    studentCode: `ST-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${new Date().getFullYear()}`
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
                const token = crypto.randomUUID().replace(/-/g, '');
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
            
            await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', result.token, 'STUDENT', targetSchoolId!);
        }

        return secureJson({ student: result.student });

    } catch (e: any) {
        return handleApiError(e);
    }
}

// PUT: Update student details
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
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
        revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!), 'max');

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return handleApiError(e);
    }
}
