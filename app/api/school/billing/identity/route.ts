import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { createIdentityVerificationSession } from '@/lib/stripe';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'PARENT']);
        const schoolId = user.schoolId!;

        const body = (await request.json().catch(() => ({}))) as any;
        const { returnPath = '/dashboard/billing' } = body;

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const returnUrl = `${domain}${returnPath}?verified=true`;

        const verificationSession = await createIdentityVerificationSession(
            user.id,
            user.email,
            returnUrl,
            {
                schoolId,
                role: user.role,
            }
        );

        try {
            await logActivity({
                userId: user.id,
                schoolId,
                action: 'INITIATE_IDENTITY_VERIFICATION',
                resourceType: 'compliance',
                after: {
                    verificationSessionId: verificationSession.id,
                    status: verificationSession.status,
                },
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            verificationSession: {
                id: verificationSession.id,
                url: verificationSession.url,
                clientSecret: verificationSession.client_secret,
                status: verificationSession.status,
            },
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
