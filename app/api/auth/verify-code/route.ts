import { prisma } from '@/lib/prisma';
import { rateLimit, secureJson, sanitizeInput } from '@/lib/security';
import { logError } from '@/lib/audit';

export async function POST(request: Request) {
    // 1. Throttling: Max 5 code verification attempts per minute per IP to block enumeration attacks
    const limit = rateLimit(request, "auth/verify-code", 5, 60_000);
    if (limit) return limit;

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const body = (await request.json().catch(() => ({}))) as { code?: string };
        const { code } = body;

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

        if (!student) {
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
                error: "Invalid Student Access Code", 
                recovery: {
                    message: "The student code was not found. Please verify the code printed on the official registration sheet provided by your school.",
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
                lastName: student.lastName,
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
