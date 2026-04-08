import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireSchoolLinked } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { Role } from '@prisma/client';

// GET: List all students in the school
export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const classId = searchParams.get('classId');

        if (id) {
            const student = await prisma.student.findUnique({
                where: { id },
                include: { grade: true, class: true }
            });
            return NextResponse.json({ student });
        }

        const students = await prisma.student.findMany({
            where: {
                schoolId: user.schoolId,
                ...(classId ? { classId } : {})
            },
            include: {
                grade: true,
                class: true,
                parentLinks: {
                    include: {
                        parent: {
                            select: { id: true, name: true, role: true }
                        }
                    }
                },
                invoices: {
                    where: { status: { in: ['PENDING', 'OVERDUE'] } },
                    select: { amount: true }
                }
            },
            orderBy: { lastName: 'asc' }
        });

        // Map students to include a finance summary
        const studentsWithStats = students.map(s => {
            const unpaidCount = s.invoices.length;
            const outstanding = s.invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

            return {
                ...s,
                finance: {
                    unpaidCount,
                    outstanding: outstanding.toFixed(2)
                }
            };
        });
        const school = await prisma.school.findUnique({
            where: { id: user.schoolId! },
            select: { name: true, address: true, logoUrl: true }
        });
        return NextResponse.json({ students: studentsWithStats, school });

    } catch (e) {
        return handleApiError(e);
    }
}

// POST: Add a new student
export async function POST(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        if (!user.schoolId && user.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Configuration Error: User not linked to school" }, { status: 403 });
        }

        const targetSchoolId = user.schoolId;
        const body = await request.json();
        const {
            firstName, lastName, grade, classId, email,
            gender, dob, address, guardianName, guardianPhone, secondaryPhone, guardianRelation, grandfatherName, photoUrl
        } = body;

        let gradeRecord: any;
        if (grade) {
            gradeRecord = await prisma.grade.findFirst({
                where: { schoolId: targetSchoolId!, level: parseInt(grade) || 0 }
            });

            if (!gradeRecord) {
                gradeRecord = await prisma.grade.create({
                    data: {
                        schoolId: targetSchoolId!,
                        level: parseInt(grade) || 0,
                        name: `Grade ${grade}`
                    }
                });
            }
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
                guardianRelation: guardianRelation || null,
                grandfatherName: grandfatherName || null,
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

        if (email) {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await prisma.inviteToken.create({
                data: {
                    token,
                    email,
                    role: 'STUDENT',
                    schoolId: targetSchoolId!,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                }
            });

            const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
            const inviteUrl = `${origin}/invite/${token}`;

            const school = await prisma.school.findUnique({ where: { id: targetSchoolId! } });
            await sendInviteEmail(email, inviteUrl, school?.name || "Your School", token, 'STUDENT', targetSchoolId!);
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

        // If classId is provided, resolve the gradeId from it
        let resolvedGradeId = data.gradeId || undefined;
        if (data.classId) {
            const cls = await prisma.class.findUnique({
                where: { id: data.classId },
                select: { gradeId: true }
            });
            if (!cls) {
                return NextResponse.json({ error: "Class not found" }, { status: 404 });
            }
            resolvedGradeId = cls.gradeId;
        }

        const student = await prisma.student.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                classId: data.classId || null,
                gradeId: resolvedGradeId,
                guardianName: data.guardianName,
                guardianPhone: data.guardianPhone,
                secondaryPhone: data.secondaryPhone,
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

        // Check if student belongs to school
        const existing = await prisma.student.findUnique({
            where: { id },
            select: { id: true, schoolId: true, userId: true }
        });

        if (!existing || existing.schoolId !== user.schoolId) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        // Perform deletion in a transaction to ensure User is also cleaned up if it exists
        const student = await prisma.$transaction(async (tx) => {
            // Delete Student first (cascades will handle attendance, grades, etc.)
            const deletedStudent = await tx.student.delete({
                where: { id }
            });

            // If there's a linked user, delete it as well
            if (existing.userId) {
                await tx.user.delete({
                    where: { id: existing.userId }
                });
            }

            return deletedStudent;
        });

        await logActivity({
            userId: user.id,
            action: 'DELETE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: id,
            before: student
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return handleApiError(e);
    }
}
