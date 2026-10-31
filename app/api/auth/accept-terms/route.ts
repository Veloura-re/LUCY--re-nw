import { NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/security';
import { rateLimitShared } from '@/lib/rate-limit';
import { recordConsent } from '@/lib/consent';

/** Records that the signed-in user accepted the current Terms of Service and Privacy Policy. */
export async function POST(request: Request) {
    try {
        const limited = await rateLimitShared(request, 'auth/accept-terms', 20);
        if (limited) return limited;

        const user = await requireAuth();
        const body = (await request.json().catch(() => null)) as { acceptedTerms?: unknown } | null;
        if (body?.acceptedTerms !== true) {
            return NextResponse.json({ error: 'You must accept the Terms of Service and Privacy Policy' }, { status: 400 });
        }

        await recordConsent({ userId: user.id, source: 'accept-terms', request });
        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
