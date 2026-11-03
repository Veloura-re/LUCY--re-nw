import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { safeNextPath } from '@/lib/safe-redirect';
import { DEVICE_COOKIE, getDeviceSessionState, setDeviceCookies } from '@/lib/device-session';
import { LEGACY_UPGRADE_UNTIL } from '@/lib/device-mark';

/**
 * One-time upgrade for users who were signed in before the signed device mark existed. The existing
 * device cookie must match the token stored for the user, which only a completed sign-in produces,
 * so a session obtained any other way cannot use this. Refused after LEGACY_UPGRADE_UNTIL.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const next = safeNextPath(searchParams.get('next'), '/dashboard');

    const { data: { user } } = await (await createClient()).auth.getUser();
    if (user && Date.now() < LEGACY_UPGRADE_UNTIL && (await getDeviceSessionState(user.id)) === 'valid') {
        const token = (await cookies()).get(DEVICE_COOKIE)?.value;
        if (token) {
            const response = NextResponse.redirect(`${origin}${next}`);
            await setDeviceCookies(response, user.id, token);
            return response;
        }
    }
    return NextResponse.redirect(`${origin}/logout?reason=session`);
}
