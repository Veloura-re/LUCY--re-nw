import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const { token, userId, name, email } = await request.json() as { token: string; userId: string; name: string; email: string };

    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Validate Token
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('InviteToken')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (inviteError || !invite) {
            throw new Error("Invalid or expired token");
        }
        if (new Date(invite.expiresAt) < new Date()) {
            throw new Error("Invalid or expired token");
        }

        // If token already used, check if the user already exists with this ID
        if (invite.usedAt) {
            const { data: existingRegistered } = await supabaseAdmin
                .from('User')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
                
            if (existingRegistered) {
                
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = userId || undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'REGISTER', resourceType: 'director_registration', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, userId });
            }
            throw new Error("Token already used");
        }

        const finalEmail = email || invite.email;

        // 2. Find if a placeholder user exists
        const { data: existingUser } = await supabaseAdmin
            .from('User')
            .select('*')
            .eq('email', finalEmail)
            .maybeSingle();

        if (existingUser && existingUser.id !== userId) {
            const placeholderId = existingUser.id;

            // 3. Sequential Migration of User relations
            const updates = [
                // Teacher/Staff related
                { table: 'TeacherAssignment', col: 'teacherId' },
                { table: 'Timetable', col: 'teacherId' },
                { table: 'Class', col: 'homeroomTeacherId' },
                { table: 'MarklistConfig', col: 'teacherId' },
                
                // Content & Grading
                { table: 'Exam', col: 'createdById' },
                { table: 'Exam', col: 'lockedById' },
                { table: 'Lesson', col: 'teacherId' },
                { table: 'GradeRecord', col: 'createdById' },
                { table: 'AttendanceRecord', col: 'createdById' },
                { table: 'AttendanceRecord', col: 'lockedById' },

                // Communications
                { table: 'Message', col: 'fromUserId' },
                { table: 'Message', col: 'toUserId' },
                { table: 'ChatRoomMember', col: 'userId' },

                // Notes & Remarks
                { table: 'StudentRemark', col: 'teacherId' },
                { table: 'InternalNote', col: 'authorId' },

                // System & Assets
                { table: 'AuditLog', col: 'userId' },
                { table: 'BookRequest', col: 'userId' },
                { table: 'Certificate', col: 'issuedById' },
                { table: 'ResourceProgress', col: 'userId' },

                // Parent/Student relations
                { table: 'AbsenceAuthorization', col: 'parentId' },
                { table: 'ParentStudentLink', col: 'parentId' },
                { table: 'Student', col: 'userId' },
                { table: 'Event', col: 'createdById' }
            ];

            for (const { table, col } of updates) {
                await supabaseAdmin.from(table).update({ [col]: userId }).eq(col, placeholderId);
            }

            // Delete the placeholder user
            await supabaseAdmin.from('User').delete().eq('id', placeholderId);
        }

        // 5. Upsert the final User record via Supabase
        const { error: upsertError } = await supabaseAdmin.from('User').upsert({
            id: userId,
            email: finalEmail,
            name: name,
            role: invite.role,
            verified: true,
            schoolId: invite.schoolId,
            updatedAt: new Date().toISOString(),
            ...(existingUser ? {
                teacherCode: existingUser.teacherCode,
                gender: existingUser.gender,
                phone: existingUser.phone,
                qualification: existingUser.qualification,
                photoUrl: existingUser.photoUrl
            } : {})
        });

        if (upsertError) {
            console.error("User upsert error:", JSON.stringify(upsertError, null, 2));
            throw new Error(`Failed to finalize user record: ${upsertError.message} (Code: ${upsertError.code}, Details: ${upsertError.details})`);
        }

        // Link Student record if applicable
        if (invite.role === 'STUDENT') {
            await supabaseAdmin.from('Student').update({ userId: userId }).eq('email', finalEmail).eq('schoolId', invite.schoolId);
        }

        // 6. Post-migration logic: Add to Global School Chat if schoolId exists
        if (invite.schoolId) {
            try {
                // Ensure school is ACTIVE
                await supabaseAdmin.from('School').update({ status: 'ACTIVE' }).eq('id', invite.schoolId);

                // Find "Global School" Chat Room
                let { data: globalSchoolChat } = await supabaseAdmin
                    .from('ChatRoom')
                    .select('id')
                    .eq('schoolId', invite.schoolId)
                    .eq('name', 'Global School')
                    .eq('type', 'GROUP')
                    .maybeSingle();

                if (!globalSchoolChat) {
                    const { data: newChat } = await supabaseAdmin.from('ChatRoom').insert({
                        schoolId: invite.schoolId,
                        name: "Global School",
                        type: "GROUP",
                    }).select('id').single();
                    globalSchoolChat = newChat;
                }

                if (globalSchoolChat) {
                    // Add User to Chat Room
                    await supabaseAdmin.from('ChatRoomMember').upsert({
                        chatRoomId: globalSchoolChat.id,
                        userId: userId
                    }, { onConflict: 'chatRoomId,userId' });
                }
            } catch (chatError) {
                console.error("Post-registration chat/school update failed:", chatError);
            }
        }

        // 7. Burn Token
        await supabaseAdmin.from('InviteToken').update({ usedAt: new Date().toISOString() }).eq('token', token);
        
        // 8. Asynchronous Welcome Email Dispatch
        if (finalEmail && !finalEmail.endsWith('@lucy.local')) {
            try {
                const { sendWelcomeEmail } = await import('@/lib/email');
                sendWelcomeEmail({
                    toEmail: finalEmail,
                    name: name,
                    role: invite.role,
                    schoolId: invite.schoolId || undefined
                }).catch((emailErr) => console.warn('[dir-register] Welcome email failed:', emailErr));
            } catch { /* non-blocking */ }
        }

        if (invite.schoolId) {
            const { revalidateTag } = require('next/cache');
            revalidateTag(`school-${invite.schoolId}`, 'max');
            revalidateTag(`users-${invite.schoolId}`, 'max');
            revalidateTag(`teacher-registry-${invite.schoolId}`, 'max');
        }

        return NextResponse.json({ success: true, userId });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
