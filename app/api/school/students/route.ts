import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole, requireSchoolLinked, secureJson, sanitizeInput } from '@/lib/security';
import { logActivity, logError } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, getSchoolTag } from '@/lib/cache-keys';
import { getPaginatedSchoolStudents } from '@/lib/services/students';
import { Gender } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { getCachedUser } from '@/lib/users';

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

        const normalizeKey = (str: string | null | undefined): string => {
            if (!str) return '';
            return str.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Fetch all classes and grades belonging to the institution for deterministic resolution
        const institutionClasses = await prisma.class.findMany({
            where: {
                OR: [
                    { schoolId: targetSchoolId },
                    { grade: { schoolId: targetSchoolId } }
                ]
            },
            include: { grade: true }
        });

        const institutionGrades = await prisma.grade.findMany({
            where: { schoolId: targetSchoolId },
            orderBy: { level: 'asc' }
        });

        // 1. Cross-Tenant Validation & Resolution: Class belongs to target institution
        let matchedClass = null;
        if (resolvedClassId) {
            const trimmedClass = resolvedClassId.trim();
            const classNorm = normalizeKey(trimmedClass);
            const classUuidValid = isUuid(trimmedClass);

            matchedClass = institutionClasses.find(c => {
                if (classUuidValid && c.id.toLowerCase() === trimmedClass.toLowerCase()) return true;
                if (c.name.trim().toLowerCase() === trimmedClass.toLowerCase()) return true;
                const cNorm = normalizeKey(c.name);
                if (cNorm && cNorm === classNorm) return true;
                if (cNorm.replace(/^(class|grade)/, '') === classNorm.replace(/^(class|grade)/, '')) return true;
                return false;
            }) || null;

            if (matchedClass) {
                resolvedClassId = matchedClass.id;
                resolvedGradeId = matchedClass.gradeId;
                if (!matchedClass.schoolId) {
                    prisma.class.update({ where: { id: matchedClass.id }, data: { schoolId: targetSchoolId } }).catch(() => {});
                }
            } else {
                resolvedClassId = null;
            }
        }

        // If no class matched yet, check if resolvedGradeId was actually specifying a class (e.g. "11A", "11a", "Grade 11-Alpha")
        if (!matchedClass && resolvedGradeId) {
            const trimmedGrade = resolvedGradeId.trim();
            const gradeNorm = normalizeKey(trimmedGrade);
            const candidateClass = institutionClasses.find(c => {
                if (c.name.trim().toLowerCase() === trimmedGrade.toLowerCase()) return true;
                const cNorm = normalizeKey(c.name);
                if (cNorm && cNorm === gradeNorm) return true;
                if (cNorm.replace(/^(class|grade)/, '') === gradeNorm.replace(/^(class|grade)/, '')) return true;
                return false;
            });
            if (candidateClass) {
                matchedClass = candidateClass;
                resolvedClassId = candidateClass.id;
                resolvedGradeId = candidateClass.gradeId;
                if (!candidateClass.schoolId) {
                    prisma.class.update({ where: { id: candidateClass.id }, data: { schoolId: targetSchoolId } }).catch(() => {});
                }
            }
        }

        // 2. Cross-Tenant Validation & Resolution: Grade
        let matchedGrade = null;
        if (matchedClass) {
            matchedGrade = matchedClass.grade;
        } else if (resolvedGradeId) {
            const trimmedGrade = resolvedGradeId.trim();
            const gradeNorm = normalizeKey(trimmedGrade);
            const gradeUuidValid = isUuid(trimmedGrade);

            matchedGrade = institutionGrades.find(g => {
                if (gradeUuidValid && g.id.toLowerCase() === trimmedGrade.toLowerCase()) return true;
                if (g.name.trim().toLowerCase() === trimmedGrade.toLowerCase()) return true;
                const gNorm = normalizeKey(g.name);
                if (gNorm && gNorm === gradeNorm) return true;
                if (gNorm.replace(/^grade/, '') === gradeNorm.replace(/^grade/, '')) return true;
                const num = parseInt(gradeNorm.replace(/\D/g, ''), 10);
                if (!isNaN(num) && g.level === num) return true;
                return false;
            }) || null;
        }

        if (!matchedGrade) {
            matchedGrade = institutionGrades[0] || null;
        }

        if (!matchedGrade) {
            matchedGrade = await prisma.grade.create({
                data: {
                    name: "Grade 1",
                    level: 1,
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
            const randHex = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(2))).map(b => b.toString(16).padStart(2, '0')).join('');
            const fallbackEntropy = `${Date.now().toString(36).toUpperCase().slice(-5)}${randHex.toUpperCase().substring(0, 3)}`;
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

        // 7. Auto-Provision Existing Fee Structures so new student receives all active school fees
        try {
            const activeFees = await prisma.feeStructure.findMany({
                where: {
                    schoolId: targetSchoolId,
                    OR: [
                        { gradeId: null },
                        { gradeId: result.student.gradeId },
                        { gradeId: 'ALL' }
                    ]
                }
            });

            if (activeFees.length > 0) {
                let totalAmount = new Decimal(0);
                for (const f of activeFees) {
                    totalAmount = totalAmount.plus(new Decimal(f.amount.toString()));
                }

                await prisma.invoice.create({
                    data: {
                        studentId: result.student.id,
                        schoolId: targetSchoolId!,
                        amount: totalAmount,
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        status: 'PENDING',
                        items: {
                            create: activeFees.map(fee => ({
                                name: fee.name,
                                amount: fee.amount,
                                description: `${fee.category} - ${fee.frequency}`,
                                feeStructureId: fee.id
                            }))
                        }
                    }
                });
            }
        } catch (feeErr) {
            console.error("[Student Create Fee Auto-Provision Warning]:", feeErr);
        }

        // 8. Explicit Parent Linking (Strict Exact Match on School-Scoped Accounts)
        try {
            const parentConditions: any[] = [];
            const cleanPhone = (guardianPhone || secondaryPhone)?.trim();
            if (cleanPhone && cleanPhone.length >= 8) {
                parentConditions.push({ phone: cleanPhone });
            }

            if (parentConditions.length > 0 && targetSchoolId) {
                const matchingParents = await prisma.user.findMany({
                    where: {
                        role: 'PARENT',
                        schoolId: targetSchoolId,
                        OR: parentConditions
                    }
                });

                for (const parent of matchingParents) {
                    await prisma.parentStudentLink.upsert({
                        where: {
                            parentId_studentId: {
                                parentId: parent.id,
                                studentId: result.student.id
                            }
                        },
                        update: {},
                        create: {
                            parentId: parent.id,
                            studentId: result.student.id,
                            pairingMethod: 'ADMIN',
                            verifiedAt: new Date()
                        }
                    }).catch(() => {});
                }
            }
        } catch (linkErr) {
            console.error("[Student Create Parent Auto-Link Warning]:", linkErr);
        }

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

        // Validate new class if provided
        if (data.classId !== undefined) {
            if (!data.classId || typeof data.classId !== 'string' || !data.classId.trim()) {
                data.classId = null;
            } else {
                const trimmedClass = data.classId.trim();
                const isClassUuid = isUuid(trimmedClass);
                const classNorm = trimmedClass.toLowerCase().replace(/[^a-z0-9]/g, '');

                const institutionClasses = await prisma.class.findMany({
                    where: {
                        OR: [
                            { schoolId: user.schoolId! },
                            { grade: { schoolId: user.schoolId! } }
                        ]
                    },
                    include: { grade: true }
                });

                const cls = institutionClasses.find(c => {
                    if (isClassUuid && c.id.toLowerCase() === trimmedClass.toLowerCase()) return true;
                    if (c.name.trim().toLowerCase() === trimmedClass.toLowerCase()) return true;
                    const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cNorm && cNorm === classNorm) return true;
                    if (cNorm.replace(/^(class|grade)/, '') === classNorm.replace(/^(class|grade)/, '')) return true;
                    return false;
                });

                if (!cls) {
                    return secureJson({ error: "Selected class does not belong to your institution." }, 400);
                }
                data.classId = cls.id;
                data.gradeId = cls.gradeId; // Ensure grade is synchronized to the assigned class
                if (!cls.schoolId) {
                    prisma.class.update({ where: { id: cls.id }, data: { schoolId: user.schoolId! } }).catch(() => {});
                }
            }
        } else if (data.gradeId) {
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
                // Check if user has other student profiles or active memberships before deleting identity
                const otherStudents = await prisma.student.count({
                    where: { userId: student.userId, id: { not: id } }
                });
                const userObj = await prisma.user.findUnique({
                    where: { id: student.userId },
                    select: { role: true }
                });

                if (otherStudents === 0 && userObj?.role === 'STUDENT') {
                    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
                    const supabaseAdmin = createSupabaseAdmin(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    await supabaseAdmin.auth.admin.deleteUser(student.userId).catch(() => {});
                    await prisma.user.delete({ where: { id: student.userId } }).catch(() => {});
                }
            } catch (err) {
                console.error("Failed to safely delete student auth user account:", err);
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
