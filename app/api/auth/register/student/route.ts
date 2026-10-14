import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { rateLimitShared } from '@/lib/rate-limit';

export async function POST(req: Request) {
    // The access code is the only credential here, so guessing must be slow
    const limited = await rateLimitShared(req, 'auth/register-student', 5, 10 * 60_000);
    if (limited) return limited;

    try {
        const { studentCode, email, password } = await req.json() as any;

        if (!studentCode || !password) {
            return NextResponse.json({ error: "Student Token and Secure Keyphrase required" }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Verify Student Code exists and is unused
        const sanitizedCode = studentCode.trim().toUpperCase();
        
        const { data: student } = await supabaseAdmin
            .from('Student')
            .select('*')
            .eq('studentCode', sanitizedCode)
            .maybeSingle();

        if (!student) {
            return NextResponse.json({ error: "Invalid Authorization Token" }, { status: 404 });
        }

        if (student.userId) {
            return NextResponse.json({ error: "Token already claimed" }, { status: 409 });
        }

        const finalEmail = email || `${studentCode.toLowerCase()}@lucy.local`;

        // 2. Register in Supabase Auth
        const supabase = await createClient();

        let authUser;
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: finalEmail,
            password: password,
            options: {
                data: {
                    role: 'STUDENT',
                    full_name: `${student.firstName} ${student.lastName}`
                }
            }
        });

        if (authError) {
            if (authError.message.toLowerCase().includes("already registered")) {
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: finalEmail,
                    password: password
                });
                if (signInError) {
                    return NextResponse.json({ error: "Email already registered. Please use correct password." }, { status: 400 });
                }
                authUser = signInData.user;
            } else {
                console.error("Supabase Auth Error:", authError);
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        } else {
            authUser = authData.user;
        }

        if (!authUser) {
            return NextResponse.json({ error: "Authentication Provider Failed" }, { status: 500 });
        }

        // 3. Create User Account in Database (Synced with Supabase ID)
        try {
            const { data: user, error: upsertError } = await supabaseAdmin.from('User').upsert({
                id: authUser.id,
                email: finalEmail,
                name: `${student.firstName} ${student.lastName}`,
                role: "STUDENT",
                schoolId: student.schoolId,
                verified: true,
                updatedAt: new Date().toISOString()
            }).select().single();
            
            if (upsertError) throw upsertError;

            // 4. Link Student to User
            await supabaseAdmin.from('Student').update({ userId: user.id }).eq('id', student.id);

            // 5. Asynchronous Welcome Email Dispatch
            if (user.email && !user.email.endsWith('@lucy.local')) {
                try {
                    const { sendWelcomeEmail } = await import('@/lib/email');
                    sendWelcomeEmail({
                        toEmail: user.email,
                        name: user.name,
                        role: 'STUDENT',
                        schoolId: student.schoolId
                    }).catch((emailErr) => console.warn('[register-student] Welcome email failed:', emailErr));
                } catch { /* non-blocking */ }
            }

            // Audit log
            try {
                const { logActivity } = await import('@/lib/audit');
                const _ip = req instanceof Request ? (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined) : undefined;
                const _userId = user.id;
                if (_userId) {
                    await logActivity({ userId: _userId, action: 'REGISTER_STUDENT', resourceType: 'USER', resourceId: user.id, schoolId: student.schoolId, ip: _ip || undefined });
                }
            } catch { /* non-blocking */ }

            return NextResponse.json({
                success: true,
                message: "Identity Verification Complete. Access Granted.",
                user: { id: user.id, name: user.name, email: user.email }
            });
        } catch (dbError: any) {
            console.error("Database Sync Error:", dbError);
            return NextResponse.json({
                error: "Critical sync error. Please contact support with your student code.",
                details: dbError.message
            }, { status: 500 });
        }

    } catch (e: any) {
        console.error("Student Registration System Failure:", e);
        return NextResponse.json({ error: "Institutional Access Protocol Failed" }, { status: 500 });
    }
}
