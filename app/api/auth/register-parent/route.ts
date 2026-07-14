import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const { userId, email, name, studentCode } = await request.json() as any;

    try {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let studentInfo = null;
        let link = null;
        
        // 1. Validate student code if provided
        if (studentCode) {
            const sanitizedCode = studentCode.trim().toUpperCase();
            const { data: student } = await supabaseAdmin
                .from('Student')
                .select('*')
                .eq('studentCode', sanitizedCode)
                .maybeSingle();
            studentInfo = student;
        }

        // 2. Upsert User (handles Supabase trigger pre-creation)
        const { data: user, error: userError } = await supabaseAdmin.from('User').upsert({
            id: userId,
            email,
            name,
            role: 'PARENT',
            verified: true,
            schoolId: studentInfo ? studentInfo.schoolId : null,
            updatedAt: new Date().toISOString()
        }).select().single();

        if (userError) throw userError;

        // 3. Link Student
        if (studentInfo) {
            const { data: newLink, error: linkError } = await supabaseAdmin.from('ParentStudentLink').insert({
                parentId: user.id,
                studentId: studentInfo.id,
                pairingMethod: 'CODE'
            }).select().single();
            
            if (!linkError) {
                link = newLink;
            }

                // ---------------------------------------------------------
                // ADD TO GLOBAL SCHOOL CHAT
                // ---------------------------------------------------------
                // 1. Find "Global School" Chat Room
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
                    // 2. Add User to Chat Room
                    await supabaseAdmin.from('ChatRoomMember').upsert({
                        chatRoomId: globalSchoolChat.id,
                        userId: user.id
                    }, { onConflict: 'chatRoomId,userId' });
                }
        }

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'REGISTER', resourceType: 'registration', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ user, link });
    } catch (e: any) {
        console.error("Parent Registration Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
