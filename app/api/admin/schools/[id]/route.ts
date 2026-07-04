import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

// PATCH - Update school status (suspend/activate)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { status, subscriptionStatus, trialEndsAt } = await request.json() as any;

    const updates: any = {};
    if (status) {
        if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updates.status = status;
    }
    if (subscriptionStatus !== undefined) {
        updates.subscriptionStatus = subscriptionStatus;
    }
    if (trialEndsAt !== undefined) {
        updates.trialEndsAt = trialEndsAt;
    }

    try {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: school, error } = await supabaseAdmin
            .from('School')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        return NextResponse.json({ school });
    } catch (error) {
        console.error("Error updating school:", error);
        return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
    }
}


// DELETE - Delete school and all related data
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const dbUser = await verifySuperAdmin();

    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    try {
        console.log(`[AdminAPI] Purging School: ${id} via Supabase SDK`);
        
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 0. Verify the school exists
        const { data: existingSchool } = await supabaseAdmin.from('School').select('id').eq('id', id).maybeSingle();
        if (!existingSchool) {
            console.log(`[AdminAPI] School ${id} already deleted. Acknowledging.`);
            return NextResponse.json({ success: true, message: 'Already deleted' });
        }

        // Collect all user IDs associated with the school
        const { data: schoolUsers } = await supabaseAdmin.from('User').select('id').eq('schoolId', id);
        const userIds = (schoolUsers || []).map((u: any) => u.id);
        console.log(`[AdminAPI] Found ${userIds.length} users to purge from Supabase.`);

        // Collect all student IDs associated with the school
        const { data: schoolStudents } = await supabaseAdmin.from('Student').select('id').eq('schoolId', id);
        const studentIds = (schoolStudents || []).map((s: any) => s.id);
        console.log(`[AdminAPI] Found ${studentIds.length} students to purge from Supabase.`);

        const { data: schoolClasses } = await supabaseAdmin.from('Class').select('id').eq('schoolId', id);
        const classIds = (schoolClasses || []).map((c: any) => c.id);
        
        // Purge tables sequentially due to FK dependencies
        // Deepest leaves first
        if (classIds.length > 0) {
            await supabaseAdmin.from('Timetable').delete().in('classId', classIds);
            await supabaseAdmin.from('TeacherAssignment').delete().in('classId', classIds);
            await supabaseAdmin.from('Lesson').delete().in('classId', classIds);
        }
        
        if (studentIds.length > 0) {
            await supabaseAdmin.from('ParentStudentLink').delete().in('studentId', studentIds);
            await supabaseAdmin.from('AttendanceRecord').delete().in('studentId', studentIds);
            await supabaseAdmin.from('GradeRecord').delete().in('studentId', studentIds);
            await supabaseAdmin.from('ExamAttempt').delete().in('studentId', studentIds);
            await supabaseAdmin.from('Certificate').delete().in('studentId', studentIds);
            await supabaseAdmin.from('StudentRemark').delete().in('studentId', studentIds);
            await supabaseAdmin.from('InternalNote').delete().in('studentId', studentIds);
            await supabaseAdmin.from('AbsenceAuthorization').delete().in('studentId', studentIds);
        }
        
        // Let's rely on standard schoolId cascading where possible or delete explicitly
        await supabaseAdmin.from('Student').delete().eq('schoolId', id);
        
        await supabaseAdmin.from('Invoice').delete().eq('schoolId', id);
        await supabaseAdmin.from('FeeStructure').delete().eq('schoolId', id);
        
        await supabaseAdmin.from('MarklistConfig').delete().eq('schoolId', id);
        await supabaseAdmin.from('AssignmentSubmission').delete().eq('schoolId', id);
        await supabaseAdmin.from('Assignment').delete().eq('schoolId', id);
        await supabaseAdmin.from('BookRequest').delete().eq('schoolId', id);
        await supabaseAdmin.from('UnitPack').delete().eq('schoolId', id);
        await supabaseAdmin.from('Book').delete().eq('schoolId', id);
        
        await supabaseAdmin.from('Exam').delete().eq('schoolId', id);
        await supabaseAdmin.from('Period').delete().eq('schoolId', id);
        await supabaseAdmin.from('Class').delete().eq('schoolId', id);
        await supabaseAdmin.from('Grade').delete().eq('schoolId', id);
        await supabaseAdmin.from('Subject').delete().eq('schoolId', id);
        
        await supabaseAdmin.from('Message').delete().eq('schoolId', id);
        await supabaseAdmin.from('ChatRoomMember').delete().eq('schoolId', id);
        await supabaseAdmin.from('ChatRoom').delete().eq('schoolId', id);
        await supabaseAdmin.from('Event').delete().eq('schoolId', id);
        await supabaseAdmin.from('AuditLog').delete().eq('schoolId', id);
        await supabaseAdmin.from('InviteToken').delete().eq('schoolId', id);
        
        await supabaseAdmin.from('User').delete().eq('schoolId', id);
        await supabaseAdmin.from('School').delete().eq('id', id);

        // Purge Supabase Auth accounts
        if (userIds.length > 0) {
            const supabaseAdminAuth = createAdminClient();
            await Promise.all(
                userIds.map(async (uid: string) => {
                    await supabaseAdminAuth.auth.admin.deleteUser(uid).catch(() => {});
                })
            );
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminAPI] Error purging school:", error);
        return NextResponse.json({
            error: 'Failed to delete school',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
