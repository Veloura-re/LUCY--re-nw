import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { rateLimit } from '@/lib/security';

export async function POST(request: Request) {
    const limit = rateLimit(request, "auth/register-parent", 10);
    if (limit) return limit;

    try {
        const { userId, email, name, studentCode } = await request.json() as any;

        if (!email) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Verify User Identity
        // Check session first, otherwise verify user existence in Supabase Auth
        const supabase = await createClient();
        const { data: { user: sessionUser } } = await supabase.auth.getUser();

        let verifiedUserId = sessionUser?.id;

        if (!verifiedUserId && userId) {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (authError || !authUser?.user || authUser.user.email?.toLowerCase() !== email.toLowerCase().trim()) {
                return NextResponse.json({ error: "Invalid user credentials or authentication session." }, { status: 401 });
            }
            verifiedUserId = authUser.user.id;
        }

        if (!verifiedUserId) {
            return NextResponse.json({ error: "Authentication required." }, { status: 401 });
        }

        // 2. Protect existing privileged accounts from being overwritten to PARENT
        const { data: existingDbUser } = await supabaseAdmin
            .from('User')
            .select('id, role')
            .eq('id', verifiedUserId)
            .maybeSingle();

        if (existingDbUser && existingDbUser.role && !['PARENT', 'STUDENT'].includes(existingDbUser.role)) {
            return NextResponse.json({ error: "An administrative account already exists with this ID." }, { status: 403 });
        }

        let studentInfo = null;
        let link = null;
        
        // 3. Validate student code if provided
        if (studentCode) {
            const sanitizedCode = studentCode.trim().toUpperCase();
            const { data: student } = await supabaseAdmin
                .from('Student')
                .select('*')
                .eq('studentCode', sanitizedCode)
                .maybeSingle();

            if (!student) {
                return NextResponse.json({ error: `Student Code "${sanitizedCode}" is invalid or could not be found.` }, { status: 404 });
            }
            studentInfo = student;
        }

        // 4. Upsert User
        const { data: user, error: userError } = await supabaseAdmin.from('User').upsert({
            id: verifiedUserId,
            email: email.toLowerCase().trim(),
            name: name || 'Parent',
            role: 'PARENT',
            verified: true,
            schoolId: studentInfo ? studentInfo.schoolId : (existingDbUser ? undefined : null),
            updatedAt: new Date().toISOString()
        }).select().single();

        if (userError) throw userError;

        // 5. Link Student (idempotent check)
        if (studentInfo) {
            const { data: existingLink } = await supabaseAdmin
                .from('ParentStudentLink')
                .select('id')
                .eq('parentId', user.id)
                .eq('studentId', studentInfo.id)
                .maybeSingle();

            if (!existingLink) {
                const { data: newLink, error: linkError } = await supabaseAdmin.from('ParentStudentLink').insert({
                    parentId: user.id,
                    studentId: studentInfo.id,
                    pairingMethod: 'CODE'
                }).select().single();
                
                if (!linkError) {
                    link = newLink;
                }
            } else {
                link = existingLink;
            }

            // Add to Global School Chat
            try {
                let { data: globalSchoolChat } = await supabaseAdmin
                    .from('ChatRoom')
                    .select('id')
                    .eq('schoolId', studentInfo.schoolId)
                    .eq('name', 'Global School')
                    .eq('type', 'GROUP')
                    .maybeSingle();

                if (!globalSchoolChat) {
                    const { data: newChat } = await supabaseAdmin.from('ChatRoom').insert({
                        schoolId: studentInfo.schoolId,
                        name: "Global School",
                        type: "GROUP",
                    }).select('id').single();
                    globalSchoolChat = newChat;
                }

                if (globalSchoolChat) {
                    await supabaseAdmin.from('ChatRoomMember').upsert({
                        chatRoomId: globalSchoolChat.id,
                        userId: user.id
                    }, { onConflict: 'chatRoomId,userId' });
                }
            } catch { /* non-blocking */ }
        }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || undefined) : undefined;
            if (user?.id) {
                await logActivity({ userId: user.id, action: 'REGISTER', resourceType: 'registration', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ user, link });
    } catch (e: any) {
        console.error("Parent Registration Error:", e);
        return NextResponse.json({ error: e.message || "Registration failed" }, { status: 500 });
    }
}
