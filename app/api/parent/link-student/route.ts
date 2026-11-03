import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError, secureJson, sanitizeInput } from '@/lib/security';
import { logActivity, logError } from '@/lib/audit';
import { z } from 'zod';
import { rateLimitShared } from '@/lib/rate-limit';
import { dobMatches, INVALID_CODE_OR_DOB } from '@/lib/student-code';

const LinkStudentSchema = z.object({
    studentCode: z.string().min(1).max(32).transform(val => sanitizeInput(val).toUpperCase()),
    dob: z.string().max(10),
    confirm: z.boolean().optional()
});

export async function POST(request: Request) {
    const limit = await rateLimitShared(request, "parent/link-student", 10);
    if (limit) return limit;

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const dbParent = await requireRole(['PARENT']);
        const rawBody = await request.json().catch(() => ({}));
        const parseResult = LinkStudentSchema.safeParse(rawBody);

        if (!parseResult.success) {
            return secureJson({ error: "Invalid student code format", details: parseResult.error.flatten().fieldErrors }, 400);
        }

        const { studentCode, dob, confirm } = parseResult.data;

        const student = await prisma.student.findUnique({
            where: { studentCode },
            include: {
                grade: { select: { level: true, name: true } },
                school: { select: { name: true, id: true } }
            }
        });

        if (!student || !dobMatches(student.dob, dob)) {
            await logError({
                type: 'auth_failure',
                message: `Parent ${dbParent.id} searched for non-existent student code: ${studentCode}`,
                path: '/api/parent/link-student',
                statusCode: 404,
                ip,
                userAgent
            });

            return secureJson({ 
                error: INVALID_CODE_OR_DOB, 
                recovery: {
                    message: "Check the code and the date of birth your school has on record, or ask your school's administration.",
                    format: "Expected format: ST-XXXXXX-YYYY"
                }
            }, 404);
        }

        // 1. Verification Mode: Return masked student details for confirmation
        if (!confirm) {
            return secureJson({
                success: true,
                student: {
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    schoolName: student.school.name,
                    gradeLevel: student.grade?.level || 0,
                    gradeName: student.grade?.name
                }
            });
        }

        // 2. Linking Mode: Atomic creation of relationship and school association
        const result = await prisma.$transaction(async (tx) => {
            const existingLink = await tx.parentStudentLink.findUnique({
                where: {
                    parentId_studentId: {
                        parentId: dbParent.id,
                        studentId: student.id
                    }
                }
            });

            if (existingLink) {
                return { link: existingLink, alreadyLinked: true };
            }

            const link = await tx.parentStudentLink.create({
                data: {
                    parentId: dbParent.id,
                    studentId: student.id,
                    pairingMethod: 'CODE',
                    verifiedAt: new Date()
                }
            });

            // Ensure parent is linked to the student's school if not already
            if (!dbParent.schoolId) {
                await tx.user.update({
                    where: { id: dbParent.id },
                    data: { schoolId: student.schoolId }
                });
            }

            return { link, alreadyLinked: false };
        });

        // 3. Security Audit Log
        await logActivity({
            userId: dbParent.id,
            schoolId: student.schoolId,
            action: 'LINK_PARENT_STUDENT',
            resourceType: 'PARENT_STUDENT_LINK',
            resourceId: result.link.id,
            ip,
            userAgent,
            after: { parentId: dbParent.id, studentId: student.id }
        });

        return secureJson({ 
            success: true, 
            link: result.link,
            message: result.alreadyLinked ? "Student was already linked to your account." : "Student successfully linked."
        });

    } catch (e: any) {
        if (e.code === 'P2002') {
            return secureJson({ error: 'You are already linked to this student.' }, 400);
        }
        return handleApiError(e);
    }
}
