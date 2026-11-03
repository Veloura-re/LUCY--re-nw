import { prisma } from '@/lib/prisma';
import { secureJson, sanitizeInput } from '@/lib/security';
import { logError } from '@/lib/audit';
import { rateLimitShared } from '@/lib/rate-limit';
import { dobMatches, INVALID_CODE_OR_DOB } from '@/lib/student-code';

export async function POST(request: Request) {
    // 1. Throttling: Max 5 code verification attempts per minute per IP to block enumeration attacks
    const limit = await rateLimitShared(request, "auth/verify-code", 5, 60_000);
    if (limit) return limit;

    // Slower, longer window so a single address cannot walk the code space at the per-minute pace all day.
    const hourly = await rateLimitShared(request, "auth/verify-code-hourly", 25, 60 * 60_000);
    if (hourly) return hourly;

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const body = (await request.json().catch(() => ({}))) as { code?: string; dob?: string };
        const { code, dob } = body;

        if (!code || typeof code !== 'string') {
            return secureJson({ error: "Student access code is required" }, 400);
        }

        const sanitizedCode = sanitizeInput(code).toUpperCase().slice(0, 32);

        const student = await prisma.student.findUnique({
            where: { studentCode: sanitizedCode },
            include: {
                school: {
                    select: { name: true }
                },
                grade: {
                    select: { level: true, name: true }
                }
            }
        });

        if (!student || !dobMatches(student.dob, dob)) {
            await logError({
                type: 'auth_failure',
                message: `Failed student access code verification attempt: "${sanitizedCode}"`,
                path: '/api/auth/verify-code',
                statusCode: 404,
                ip,
                userAgent,
                metadata: { attemptedCode: sanitizedCode }
            });

            return secureJson({ 
                error: INVALID_CODE_OR_DOB, 
                recovery: {
                    message: "Check the code printed on the official registration sheet and the date of birth your school has on record.",
                    format: "Expected format: ST-XXXXXX-YYYY"
                }
            }, 404);
        }

        // Return student details safely without leaking PII (no phone, no home address)
        return secureJson({
            success: true,
            student: {
                id: student.id,
                firstName: student.firstName,
                // Only the initial: enough for a parent to confirm the child, useless for harvesting names.
                lastName: student.lastName ? `${student.lastName.trim().charAt(0).toUpperCase()}.` : "",
                schoolName: student.school.name,
                gradeLevel: student.grade?.level || 0,
                gradeName: student.grade?.name || undefined
            }
        }, 200);

    } catch (e: any) {
        console.error("[verify-code] Verification Error:", e);
        await logError({
            type: 'api_error',
            message: e?.message || "Internal server error during code verification",
            path: '/api/auth/verify-code',
            statusCode: 500,
            ip,
            userAgent
        });
        return secureJson({ error: "Verification service temporarily unavailable" }, 500);
    }
}
