import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireSchoolLinked, secureJson, sanitizeInput } from '@/lib/security';
import { logActivity, logError } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { getPaginatedSchoolStudents } from '@/lib/services/students';
import { Gender } from '@prisma/client';
import { z } from 'zod';

const StudentCreateSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(100).transform(sanitizeInput),
    lastName: z.string().min(1, "Last name is required").max(100).transform(sanitizeInput),
    grade: z.string().optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : ""),
    gradeId: z.string().optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : ""),
    classId: z.string().optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : null),
    email: z.string().email().optional().nullable().or(z.literal('')).transform(val => (val ? sanitizeInput(val).toLowerCase() : null)),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable().or(z.literal('')).transform(val => (val === '' ? null : val)),
    dob: z.string().optional().nullable().or(z.literal('')).transform(val => (val === '' ? null : val)),
    age: z.union([z.string(), z.number()]).optional().nullable(),
    address: z.string().max(255).optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : null),
    guardianName: z.string().max(100).optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : null),
    guardianPhone: z.string().max(50).optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : null),
    secondaryPhone: z.string().max(50).optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val) : null),
    photoUrl: z.string().optional().nullable().or(z.literal('')).or(z.literal(null)).transform(val => (val ? sanitizeInput(val) : null))
});

const StudentUpdateSchema = z.object({
    id: z.string().min(1, "Student ID is required"),
    firstName: z.string().min(1).max(100).optional().transform(val => val ? sanitizeInput(val) : undefined),
    lastName: z.string().min(1).max(100).optional().transform(val => val ? sanitizeInput(val) : undefined),
    gradeId: z.string().optional().transform(val => val ? sanitizeInput(val) : undefined),
    classId: z.string().optional().nullable().transform(val => val ? sanitizeInput(val) : null),
    email: z.string().email().optional().nullable().or(z.literal('')).transform(val => val ? sanitizeInput(val).toLowerCase() : null),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable().or(z.literal('')).transform(val => (val === '' ? null : val)),
    dob: z.string().optional().nullable(),
    address: z.string().max(255).optional().nullable().transform(val => val ? sanitizeInput(val) : undefined),
    guardianName: z.string().max(100).optional().nullable().transform(val => val ? sanitizeInput(val) : undefined),
    guardianPhone: z.string().max(50).optional().nullable().transform(val => val ? sanitizeInput(val) : undefined),
    secondaryPhone: z.string().max(50).optional().nullable().transform(val => val ? sanitizeInput(val) : undefined),
    photoUrl: z.string().optional().nullable().or(z.literal('')).transform(val => (val ? sanitizeInput(val) : null))
});

// GET: List all students in the school
export async function GET(request: Request) {
    try {
        const user = await requireSchoolLinked();
        if (user.role === 'PARENT' || user.role === 'STUDENT') {
            return secureJson({ error: 'Forbidden: Access denied' }, 403);
        }
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const classId = searchParams.get('classId') || undefined;
        const search = searchParams.get('search') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const sortBy = (searchParams.get('sortBy') as 'NAME' | 'CLASS') || 'NAME';
        const sortDir = (searchParams.get('sortDir') as 'ASC' | 'DESC') || 'ASC';

        if (id) {
            const student = await prisma.student.findFirst({
                where: { id, schoolId: user.schoolId! },
                include: { grade: true, class: true }
            });

            if (!student) {
                return secureJson({ error: 'Student not found in your school' }, 404);
            }
            return secureJson({ student });
        }

        const result = await getPaginatedSchoolStudents(user.schoolId!, {
            page,
            limit,
            search,
            classId,
            sortBy,
            sortDir
        });

        return secureJson({ 
            students: result.data, 
            pagination: result.metadata 
        });

    } catch (e) {
        return handleApiError(e);
    }
}

// POST: Add a new student
export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const rawBody = await request.json();
        
        let targetSchoolId = user.schoolId;
        if (!targetSchoolId) {
            try {
                const { getCachedUser } = require('@/lib/users');
                const enriched = await getCachedUser(user.id);
                targetSchoolId = enriched?.schoolId || null;
            } catch {}
        }
        if (!targetSchoolId) {
            return secureJson({ error: "No active school associated with your account." }, 400);
        }

        const parseResult = StudentCreateSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return secureJson({ 
                error: "Validation failed for student details", 
                details: parseResult.error.flatten().fieldErrors 
            }, 400);
        }

        const {
            firstName, lastName, grade: gradeInput, gradeId: gradeIdInput, classId, email,
            gender, dob, age, address, guardianName, guardianPhone, secondaryPhone, photoUrl
        } = parseResult.data;

        // Safely parse or infer DOB from age
        let parsedDob: Date | null = null;
        if (dob && typeof dob === 'string' && dob.trim()) {
            const candidate = new Date(dob);
            if (!isNaN(candidate.getTime())) {
                parsedDob = candidate;
            }
        }
        if (!parsedDob && age !== undefined && age !== null && age !== '') {
            const ageNum = parseInt(String(age), 10);
            if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
                const estYear = new Date().getFullYear() - ageNum;
                parsedDob = new Date(Date.UTC(estYear, 0, 1));
            }
        }

        let resolvedGradeId = gradeIdInput || gradeInput || null;
        let resolvedClassId = classId || null;

        const isUuid = (str: string | null | undefined): boolean => {
            if (!str || typeof str !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
        };

        // 1. Cross-Tenant Validation & Resolution: Class belongs to target institution
        if (resolvedClassId) {
            const classUuidValid = isUuid(resolvedClassId);
            const cls = await prisma.class.findFirst({
                where: {
                    ...(classUuidValid ? { id: resolvedClassId } : { name: { equals: resolvedClassId, mode: 'insensitive' } }),
                    OR: [
                        { schoolId: targetSchoolId },
                        { grade: { schoolId: targetSchoolId } }
                    ]
                }
            });
            if (cls) {
                resolvedClassId = cls.id;
                if (!resolvedGradeId) {
                    resolvedGradeId = cls.gradeId;
                }
            } else {
                resolvedClassId = null;
            }
        }

        // 2. Cross-Tenant Validation & Resolution: Grade
        let matchedGrade = null;
        if (resolvedGradeId) {
            const gradeUuidValid = isUuid(resolvedGradeId);
            matchedGrade = await prisma.grade.findFirst({
                where: {
                    schoolId: targetSchoolId,
                    ...(gradeUuidValid ? {
                        OR: [
                            { id: resolvedGradeId },
                            { name: { equals: resolvedGradeId, mode: 'insensitive' } }
                        ]
                    } : {
                        name: { equals: resolvedGradeId, mode: 'insensitive' }
                    })
                }
            });
        }

        if (!matchedGrade) {
            matchedGrade = await prisma.grade.findFirst({
                where: { schoolId: targetSchoolId },
                orderBy: { level: 'asc' }
            });
        }

        if (!matchedGrade) {
            // Auto-create initial default Grade for school so registration never blocks
            matchedGrade = await prisma.grade.create({
                data: {
                    name: "Grade 1",
                    schoolId: targetSchoolId
                }
            });
        }

        // 3. Email cross-tenant and collision checks
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (existingUser.schoolId && existingUser.schoolId !== targetSchoolId) {
                    return secureJson({ error: 'Email is already registered to another institution.' }, 400);
                }
                if (existingUser.schoolId === targetSchoolId && existingUser.verified) {
                    return secureJson({ error: 'User is already an active member of this school.' }, 400);
                }
            }

            const existingInvite = await prisma.inviteToken.findFirst({ where: { email } });
            if (existingInvite) {
                await prisma.inviteToken.delete({ where: { id: existingInvite.id } }).catch(() => {});
            }
        }

        // 4. Generate Unique Collision-Resistant Student Code with Retry Loop
        let generatedStudentCode = '';
        const currentYear = new Date().getFullYear();

        for (let attempt = 0; attempt < 5; attempt++) {
            const entropy = globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
            const candidateCode = `ST-${entropy}-${currentYear}`;
            const exists = await prisma.student.findUnique({ where: { studentCode: candidateCode } });
            if (!exists) {
                generatedStudentCode = candidateCode;
                break;
            }
        }

        if (!generatedStudentCode) {
            const fallbackEntropy = `${Date.now().toString(36).toUpperCase().slice(-5)}${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 3).toUpperCase()}`;
            generatedStudentCode = `ST-${fallbackEntropy}-${currentYear}`;
        }

        // 5. Atomic Transaction: Student Creation + Invite Token
        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
                data: {
                    firstName,
                    lastName,
                    schoolId: targetSchoolId,
                    gradeId: matchedGrade.id,
                    classId: resolvedClassId,
                    email: email || null,
                    dob: parsedDob,
                    gender: gender || null,
                    address: address || null,
                    guardianName: guardianName || null,
                    guardianPhone: guardianPhone || null,
                    secondaryPhone: secondaryPhone || null,
                    photoUrl: photoUrl || null,
                    studentCode: generatedStudentCode
                },
                include: {
                    grade: true,
                    class: true
                }
            });

            if (email) {
                const token = globalThis.crypto.randomUUID().replace(/-/g, '');
                await tx.inviteToken.create({
                    data: {
                        token,
                        email,
                        role: 'STUDENT',
                        schoolId: targetSchoolId,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    }
                });
                return { student, token };
            }

            return { student, token: null };
        });

        // 6. Security & Operations Audit Logging
        await logActivity({
            userId: user.id,
            schoolId: targetSchoolId,
            action: 'CREATE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: result.student.id,
            after: {
                id: result.student.id,
                studentCode: result.student.studentCode,
                firstName: result.student.firstName,
                lastName: result.student.lastName,
                gradeId: result.student.gradeId
            }
        }).catch(() => {});

        // Invalidate tags safely
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, targetSchoolId), 'max');
        } catch {}

        if (email && result.token) {
            try {
                const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net';
                const inviteUrl = `${origin}/invite/${result.token}`;
                const school = await prisma.school.findUnique({ where: { id: targetSchoolId! } });
                
                console.log(`📨 [STUDENTS API] Sending invite to ${email} as STUDENT for school "${school?.name}"`);
                const emailResult = await sendInviteEmail(email, inviteUrl, school?.name || 'Institution', result.token, 'STUDENT', targetSchoolId!);
                const res = emailResult as any;
                
                return secureJson({ 
                    student: result.student, 
                    token: result.token, 
                    emailSent: res?.success && !res?.skipped, 
                    emailError: res?.error || null 
                });
            } catch (err: any) {
                console.warn("[STUDENTS API] Invite email delivery skipped or failed:", err);
                return secureJson({ 
                    student: result.student, 
                    token: result.token, 
                    emailSent: false, 
                    emailError: "Invite email could not be delivered directly." 
                });
            }
        }

        return secureJson({ student: result.student });

    } catch (e: any) {
        console.error("❌ [STUDENTS API POST ERROR]:", e);
        const msg = e?.message || "Failed to create student record";
        if (msg.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
        if (msg.startsWith("Forbidden")) return secureJson({ error: msg }, 403);
        return secureJson({ error: msg }, 400);
    }
}

// PUT: Update student details with strict tenant isolation
export async function PUT(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const rawBody = await request.json();
        const parseResult = StudentUpdateSchema.safeParse(rawBody);

        if (!parseResult.success) {
            return secureJson({ 
                error: "Invalid student update payload", 
                details: parseResult.error.flatten().fieldErrors 
            }, 400);
        }

        const { id, ...data } = parseResult.data;

        // Verify student belongs to this user's school
        const existingStudent = await prisma.student.findFirst({
            where: { id, schoolId: user.schoolId! }
        });

        if (!existingStudent) {
            return secureJson({ error: "Student not found in your institution." }, 404);
        }

        const isUuid = (str: string | null | undefined): boolean => {
            if (!str || typeof str !== 'string') return false;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
        };

        // Validate new grade if provided
        if (data.gradeId) {
            const isGradeUuid = isUuid(data.gradeId);
            const grade = await prisma.grade.findFirst({
                where: {
                    ...(isGradeUuid ? { id: data.gradeId } : { name: { equals: data.gradeId, mode: 'insensitive' } }),
                    schoolId: user.schoolId!
                }
            });
            if (!grade) {
                return secureJson({ error: "Selected grade does not belong to your institution." }, 400);
            }
            data.gradeId = grade.id;
        }

        // Validate new class if provided
        if (data.classId) {
            const isClassUuid = isUuid(data.classId);
            const cls = await prisma.class.findFirst({
                where: {
                    ...(isClassUuid ? { id: data.classId } : { name: { equals: data.classId, mode: 'insensitive' } }),
                    OR: [
                        { schoolId: user.schoolId! },
                        { grade: { schoolId: user.schoolId! } }
                    ]
                }
            });
            if (!cls) {
                return secureJson({ error: "Selected class does not belong to your institution." }, 400);
            }
            data.classId = cls.id;
        }

        let updateDob: Date | undefined = undefined;
        if (data.dob && typeof data.dob === 'string' && data.dob.trim()) {
            const parsed = new Date(data.dob);
            if (!isNaN(parsed.getTime())) {
                updateDob = parsed;
            }
        }

        const student = await prisma.student.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                classId: data.classId,
                gradeId: data.gradeId,
                guardianName: data.guardianName,
                guardianPhone: data.guardianPhone,
                secondaryPhone: data.secondaryPhone,
                address: data.address,
                photoUrl: data.photoUrl,
                dob: updateDob,
                gender: data.gender
            }
        });

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId!,
            action: 'UPDATE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: student.id,
            before: existingStudent,
            after: student
        }).catch(() => {});

        // Trigger Cache Invalidation
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!), 'max');
            revalidateTag(`student-${id}`, 'max');
        } catch {}

        return secureJson({ student });

    } catch (e: any) {
        console.error("❌ [STUDENTS API PUT ERROR]:", e);
        const msg = e?.message || "Failed to update student";
        if (msg.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
        if (msg.startsWith("Forbidden")) return secureJson({ error: msg }, 403);
        return secureJson({ error: msg }, 400);
    }
}

// DELETE: Archive/Delete student with tenant isolation
export async function DELETE(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'OWNER', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return secureJson({ error: "Student ID is required" }, 400);

        // Verify student exists and belongs to this school
        const student = await prisma.student.findFirst({
            where: { id, schoolId: user.schoolId! }
        });

        if (!student) {
            return secureJson({ error: "Student not found in your institution" }, 404);
        }

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
            return secureJson({ success: true, pendingApproval: true, message: "Deletion request sent to Owner" });
        }

        await prisma.student.delete({
            where: { id }
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
            schoolId: user.schoolId!,
            action: 'DELETE_STUDENT',
            resourceType: 'STUDENT',
            resourceId: id,
            before: student
        }).catch(() => {});

        // Trigger Cache Invalidation
        try {
            revalidateTag(getSchoolTag(CACHE_TAGS.STUDENTS, user.schoolId!), 'max');
        } catch {}

        return secureJson({ success: true });

    } catch (e: any) {
        console.error("❌ [STUDENTS API DELETE ERROR]:", e);
        const msg = e?.message || "Failed to delete student";
        if (msg.startsWith("Unauthorized")) return secureJson({ error: "Unauthorized" }, 401);
        if (msg.startsWith("Forbidden")) return secureJson({ error: msg }, 403);
        return secureJson({ error: msg }, 400);
    }
}
