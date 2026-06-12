import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch (error) {
                            // Ignore error if setting cookies inside a Server Component
                        }
                    },
                },
            }
        );

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate a unique session token for this device
        const sessionToken = uuidv4();

        // Update the database to mark this device as the ONLY active session
        await prisma.user.update({
            where: { id: user.id },
            data: { activeSessionId: sessionToken } as any
        });

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
