import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEVICE_MARK_COOKIE, deviceMark } from '@/lib/device-mark';

/**
 * The device session ties a Supabase login to this server's own checks. Our server sets the cookie
 * only after a full sign-in (password plus emailed code or trusted device, or Google), and stores
 * the same token on the user. A session obtained any other way, for example by calling Supabase
 * Auth directly with a stolen password, has no matching cookie and is refused everywhere.
 */
export const DEVICE_COOKIE = 'lucy_device_session';
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function deviceCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: DEVICE_COOKIE_MAX_AGE,
    };
}

/** Sets the device session cookie and its signature on a response. */
export async function setDeviceCookies(response: NextResponse, userId: string, token: string) {
    response.cookies.set({ name: DEVICE_COOKIE, value: token, ...deviceCookieOptions() });
    response.cookies.set({ name: DEVICE_MARK_COOKIE, value: await deviceMark(userId, token), ...deviceCookieOptions() });
}

function adminClient() {
    return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Replaces the user's active session token (this also signs out their other devices) and returns it. */
export async function issueDeviceSession(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    let stored = false;

    if (prisma) {
        try {
            await prisma.user.update({ where: { id: userId }, data: { activeSessionId: token } });
            stored = true;
        } catch (err: any) {
            console.warn('[device-session] Prisma update failed, falling back to Supabase admin:', err.message);
        }
    }

    if (!stored) {
        const { error } = await adminClient().from('User').update({ activeSessionId: token }).eq('id', userId);
        if (error) throw new Error('Could not start a session');
    }
    return token;
}

async function readActiveSessionId(userId: string): Promise<string | null> {
    if (prisma) {
        try {
            const row = await prisma.user.findUnique({ where: { id: userId }, select: { activeSessionId: true } });
            return row?.activeSessionId ?? null;
        } catch (err: any) {
            console.warn('[device-session] Prisma lookup failed, falling back to Supabase admin:', err.message);
        }
    }
    const { data } = await adminClient().from('User').select('activeSessionId').eq('id', userId).maybeSingle();
    return (data as { activeSessionId?: string | null } | null)?.activeSessionId ?? null;
}

const loadActiveSessionId = cache(readActiveSessionId);

export type DeviceSessionState = 'valid' | 'missing' | 'superseded';

/** `superseded` means a newer sign-in on another device replaced this one; `missing` means never completed here. Fails closed. */
export async function getDeviceSessionState(userId: string): Promise<DeviceSessionState> {
    try {
        const cookie = (await cookies()).get(DEVICE_COOKIE)?.value;
        if (!cookie) return 'missing';
        const active = await loadActiveSessionId(userId);
        if (active && active === cookie) return 'valid';
        return 'superseded';
    } catch (err: any) {
        console.error('[device-session] Check failed:', err?.message);
        return 'missing';
    }
}

/** True only when the request carries the cookie that matches the user's stored token. */
export async function hasValidDeviceSession(userId: string): Promise<boolean> {
    return (await getDeviceSessionState(userId)) === 'valid';
}
