import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, secureJson, sanitizeInput } from '@/lib/security';
import { logActivity, logError } from '@/lib/audit';
import { z } from 'zod';

const RegisterParentSchema = z.object({
    userId: z.string().uuid().optional(),
    email: z.string().email().transform(val => sanitizeInput(val).toLowerCase()),
    name: z.string().min(1).max(100).optional().transform(val => val ? sanitizeInput(val) : 'Parent'),
    studentCode: z.string().max(32).optional().transform(val => val ? sanitizeInput(val).toUpperCase() : undefined)
});

export async function POST(request: Request) {
    const limit = rateLimit(request, "auth/register-parent", 10);
    if (limit) return limit;

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
        const rawBody = await request.json();
        const parseResult = RegisterParentSchema.safeParse(rawBody);

        if (!parseResult.success) {
            return secureJson({ 
                error: "Invalid registration payload", 
                details: parseResult.error.flatten().fieldErrors 
            }, 400);
        }

        const { userId, email, name, studentCode } = parseResult.data;

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Strict Identity & IDOR Verification
        const supabase = await createClient();
        const { data: { user: sessionUser } } = await supabase.auth.getUser();

        let verifiedUserId = sessionUser?.id;

        if (sessionUser && userId && sessionUser.id !== userId) {
            await logError({
                type: 'auth_failure',
                message: `IDOR attempt blocked: Session user ${sessionUser.id} attempted to register payload for ${userId}`,
                path: '/api/auth/register-parent',
                statusCode: 403,
                ip,
                userAgent,
                metadata: { sessionUserId: sessionUser.id, payloadUserId: userId, email }
            });
            return secureJson({ error: "Access denied: User identity mismatch." }, 403);
        }

        if (!verifiedUserId && userId) {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (authError || !authUser?.user || authUser.user.email?.toLowerCase().trim() !== email) {
                await logError({
                    type: 'auth_failure',
                    message: `Unverified credentials for userId: ${userId}, email: ${email}`,
                    path: '/api/auth/register-parent',
                    statusCode: 401,
                    ip,
                    userAgent
                });
                return secureJson({ error: "Invalid user credentials or expired authentication session." }, 401);
            }
            verifiedUserId = authUser.user.id;
        }

        if (!verifiedUserId) {
            return secureJson({ error: "Authentication session required to complete registration." }, 401);
        }

        // 2. Prevent role hijacking / privilege overwriting
        const existingDbUser = await prisma.user.findUnique({
            where: { id: verifiedUserId },
            select: { id: true, role: true, schoolId: true }
        });

        if (existingDbUser && existingDbUser.role && !['PARENT', 'STUDENT'].includes(existingDbUser.role)) {
            await logError({
                type: 'auth_failure',
                message: `Privileged account ${verifiedUserId} (${existingDbUser.role}) blocked from registration downgrade to PARENT`,
                path: '/api/auth/register-parent',
                statusCode: 403,
                ip,
                userAgent
            });
            return secureJson({ error: "An administrative account is already associated with this identity." }, 403);
        }

        // 3. Validate Student Code if provided with Smart Onboarding Recovery
        let studentInfo: { id: string; schoolId: string; firstName: string; lastName: string } | null = null;

        if (studentCode) {
            const student = await prisma.student.findUnique({
                where: { studentCode },
                select: { id: true, schoolId: true, firstName: true, lastName: true, school: { select: { name: true } } }
            });

            if (!student) {
                await logError({
                    type: 'auth_failure',
                    message: `Invalid student code attempted: ${studentCode}`,
                    path: '/api/auth/register-parent',
                    statusCode: 404,
                    ip,
                    userAgent,
                    metadata: { studentCode, userId: verifiedUserId }
                });

                return secureJson({
                    error: `Student Code "${studentCode}" is invalid or could not be found.`,
                    recovery: {
                        help: "Please double check the code printed on the official registration dossier or contact your school's administration.",
                        format: "Expected format: ST-XXXXXX-YYYY"
                    }
                }, 404);
            }
            studentInfo = student;
        }

        // 4. Atomic Execution via Prisma Transaction
        const transactionResult = await prisma.$transaction(async (tx) => {
            // Upsert Parent User
            const user = await tx.user.upsert({
                where: { id: verifiedUserId },
                create: {
                    id: verifiedUserId,
                    email,
                    name: name || 'Parent',
                    role: 'PARENT',
                    verified: true,
                    schoolId: studentInfo ? studentInfo.schoolId : (existingDbUser ? existingDbUser.schoolId : null)
                },
                update: {
                    email,
                    name: name || undefined,
                    role: 'PARENT',
                    verified: true,
                    schoolId: studentInfo ? studentInfo.schoolId : undefined
                }
            });

            let linkRecord = null;

            // Link Student Idempotently
            if (studentInfo) {
                const existingLink = await tx.parentStudentLink.findUnique({
                    where: {
                        parentId_studentId: {
                            parentId: user.id,
                            studentId: studentInfo.id
                        }
                    }
                });

                if (!existingLink) {
                    linkRecord = await tx.parentStudentLink.create({
                        data: {
                            parentId: user.id,
                            studentId: studentInfo.id,
                            pairingMethod: 'CODE',
                            verifiedAt: new Date()
                        }
                    });
                } else {
                    linkRecord = existingLink;
                }

                // Ensure Global School Chat Membership
                try {
                    let globalChat = await tx.chatRoom.findFirst({
                        where: {
                            schoolId: studentInfo.schoolId,
                            name: "Global School",
                            type: "GROUP"
                        }
                    });

                    if (!globalChat) {
                        globalChat = await tx.chatRoom.create({
                            data: {
                                schoolId: studentInfo.schoolId,
                                name: "Global School",
                                type: "GROUP"
                            }
                        });
                    }

                    if (globalChat) {
                        await tx.chatRoomMember.upsert({
                            where: {
                                chatRoomId_userId: {
                                    chatRoomId: globalChat.id,
                                    userId: user.id
                                }
                            },
                            create: {
                                chatRoomId: globalChat.id,
                                userId: user.id
                            },
                            update: {}
                        });
                    }
                } catch (chatErr) {
                    console.warn('[register-parent] Non-blocking chat join issue:', chatErr);
                }
            }

            return { user, link: linkRecord };
        });

        // 5. Enterprise Security Audit Logging
        await logActivity({
            userId: transactionResult.user.id,
            schoolId: studentInfo?.schoolId || transactionResult.user.schoolId || undefined,
            action: 'REGISTER_PARENT',
            resourceType: 'USER',
            resourceId: transactionResult.user.id,
            ip,
            userAgent,
            after: {
                userId: transactionResult.user.id,
                email: transactionResult.user.email,
                linkedStudentId: studentInfo?.id || null
            }
        });

        // 6. Asynchronous Welcome Email Dispatch
        try {
            const { sendWelcomeEmail } = await import('@/lib/email');
            sendWelcomeEmail({
                toEmail: transactionResult.user.email,
                name: transactionResult.user.name,
                role: 'PARENT',
                schoolId: studentInfo?.schoolId || transactionResult.user.schoolId || undefined
            }).catch((emailErr) => console.warn('[register-parent] Welcome email non-blocking failed:', emailErr));
        } catch { /* non-blocking */ }

        return secureJson({ 
            success: true, 
            user: transactionResult.user, 
            link: transactionResult.link 
        }, 200);

    } catch (e: any) {
        console.error("[register-parent] Registration Error:", e);
        await logError({
            type: 'api_error',
            message: e?.message || "Internal server error during parent registration",
            stack: e?.stack,
            path: '/api/auth/register-parent',
            statusCode: 500,
            ip,
            userAgent
        });
        return secureJson({ error: "Registration processing failed. Please try again or contact support." }, 500);
    }
}
