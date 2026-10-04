import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate a unique session token for this device
        const sessionToken = crypto.randomUUID();

        // Update the database to mark this device as the ONLY active session
        let updatedDb = false;
        if (prisma) {
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { activeSessionId: sessionToken }
                });
                updatedDb = true;
            } catch (err: any) {
                console.warn("[register-session] Failed to update activeSessionId on User via Prisma:", err.message);
            }
        }

        if (!updatedDb && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            try {
                const supabaseAdmin = createSupabaseAdmin(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                await supabaseAdmin
                    .from('User')
                    .update({ activeSessionId: sessionToken })
                    .eq('id', user.id);
            } catch (supaErr: any) {
                console.warn("[register-session] Supabase Admin fallback session update failed:", supaErr.message);
            }
        }

        // Set the active session token in an HTTP-only cookie
        const response = NextResponse.json({ success: true, sessionToken });
        
        response.cookies.set({
            name: 'lucy_device_session',
            value: sessionToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;

    } catch (e: any) {
        console.error("Failed to register active session:", e);
        return NextResponse.json({ error: "Failed to register session" }, { status: 500 });
    }
}
