import { NextResponse } from 'next/server';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { revokeTrustedDevices, TRUSTED_COOKIE } from '@/lib/login-otp';
import { logActivity, getIp } from '@/lib/audit';

/** Forgets every browser trusted to skip the emailed code, including this one. */
export async function DELETE(request: Request) {
    try {
        const user = await requireSchoolLinked();
        const removed = await revokeTrustedDevices(user.id);

        await logActivity({
            userId: user.id,
            schoolId: user.schoolId ?? undefined,
            action: 'REVOKE_TRUSTED_DEVICES',
            resourceType: 'auth',
            ip: getIp(request),
            after: { removed },
        });

        const response = NextResponse.json({ success: true, removed });
        response.cookies.set({ name: TRUSTED_COOKIE, value: '', path: '/', maxAge: 0 });
        return response;
    } catch (e) {
        return handleApiError(e);
    }
}
