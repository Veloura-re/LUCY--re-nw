import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const adminUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!adminUser.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const backupData = await request.json() as any;

        if (!backupData || !backupData.metadata || backupData.metadata.schoolId !== adminUser.schoolId) {
            return NextResponse.json({ error: 'Invalid backup file or backup belongs to another school' }, { status: 400 });
        }

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data } = backupData;
        if (!data) return NextResponse.json({ error: 'No data found in backup' }, { status: 400 });

        let restoredUsers = 0;
        let restoredStudents = 0;
        let restoredClasses = 0;

        // 1. Restore Users
        if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
                const { data: existingUser } = await supabaseAdmin.from('User').select('id').eq('id', user.id).single();
                
                if (!existingUser) {
                    // User is completely missing, restore them
                    await supabaseAdmin.from('User').insert({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        schoolId: user.schoolId,
                        verified: false, // Force them to be unverified so they must use invite token
                        createdAt: user.createdAt,
                        gender: user.gender,
                        phone: user.phone,
                        teacherCode: user.teacherCode,
                        photoUrl: user.photoUrl
                    });

                    // If staff, generate invite token and send email
                    if (['TEACHER', 'HOMEROOM', 'PRINCIPAL'].includes(user.role)) {
                        const token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 7);
                        await supabaseAdmin.from('InviteToken').insert({
                            id: globalThis.crypto.randomUUID(),
                            token,
                            email: user.email,
                            role: user.role,
                            schoolId: user.schoolId,
                            expiresAt: expiresAt.toISOString(),
                            createdAt: new Date().toISOString()
                        });
                        
                        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
                        const { sendInviteEmail } = await import('@/lib/email');
                        // Fetch school name
                        const { data: schoolData } = await supabaseAdmin.from('School').select('name').eq('id', user.schoolId).single();
                        await sendInviteEmail(user.email, inviteUrl, schoolData?.name || 'Institution', token, user.role, user.schoolId);
                    }
                    restoredUsers++;
                } else {
                    // Just update them with backup info
                    await supabaseAdmin.from('User').update({
                        name: user.name,
                        role: user.role,
                        schoolId: user.schoolId,
                        gender: user.gender,
                        phone: user.phone,
                        teacherCode: user.teacherCode,
                        photoUrl: user.photoUrl
                    }).eq('id', user.id);
                }
            }
        }

        // 2. Restore Students
        if (data.students && Array.isArray(data.students)) {
            for (const student of data.students) {
                const { data: existing } = await supabaseAdmin.from('Student').select('id').eq('id', student.id).single();
                if (!existing) {
                    await supabaseAdmin.from('Student').insert(student);
                    restoredStudents++;
                } else {
                    await supabaseAdmin.from('Student').update(student).eq('id', student.id);
                }
            }
        }

        // 3. Restore Classes
        if (data.classes && Array.isArray(data.classes)) {
            for (const cls of data.classes) {
                const { data: existing } = await supabaseAdmin.from('Class').select('id').eq('id', cls.id).single();
                if (!existing) {
                    await supabaseAdmin.from('Class').insert(cls);
                    restoredClasses++;
                } else {
                    await supabaseAdmin.from('Class').update(cls).eq('id', cls.id);
                }
            }
        }

        // 4. Upsert Grades, Subjects, etc in bulk using upsert
        if (data.grades && data.grades.length > 0) {
            await supabaseAdmin.from('Grade').upsert(data.grades);
        }
        if (data.subjects && data.subjects.length > 0) {
            await supabaseAdmin.from('Subject').upsert(data.subjects);
        }
        if (data.invoices && data.invoices.length > 0) {
            await supabaseAdmin.from('Invoice').upsert(data.invoices);
        }
        if (data.payments && data.payments.length > 0) {
            await supabaseAdmin.from('Payment').upsert(data.payments);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Restored ${restoredUsers} missing users, ${restoredStudents} missing students, ${restoredClasses} missing classes, and resynced all records.` 
        });

    } catch (error: any) {
        console.error("Backup Restore Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to restore backup' }, { status: 500 });
    }
}
