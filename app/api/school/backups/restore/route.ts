import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { sendInviteEmail } from '@/lib/email';

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
        // 1. Restore Users - strictly scoped to this school
        if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
                if (user.schoolId && user.schoolId !== adminUser.schoolId) continue;

                const { data: existingUser } = await supabaseAdmin
                    .from('User')
                    .select('id, schoolId, role')
                    .eq('id', user.id)
                    .maybeSingle();
                
                if (!existingUser) {
                    // User is completely missing, restore them into this school
                    await supabaseAdmin.from('User').insert({
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        schoolId: adminUser.schoolId,
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
                            schoolId: adminUser.schoolId,
                            expiresAt: expiresAt.toISOString(),
                            createdAt: new Date().toISOString()
                        });
                        
                        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
                        const { data: schoolData } = await supabaseAdmin.from('School').select('name').eq('id', adminUser.schoolId).single();
                        await sendInviteEmail(user.email, inviteUrl, schoolData?.name || 'Institution', token, user.role, adminUser.schoolId);
                    }
                    restoredUsers++;
                } else if (existingUser.schoolId === adminUser.schoolId) {
                    // Only update if the user already belongs to this school
                    await supabaseAdmin.from('User').update({
                        name: user.name,
                        role: user.role,
                        gender: user.gender,
                        phone: user.phone,
                        teacherCode: user.teacherCode,
                        photoUrl: user.photoUrl
                    }).eq('id', user.id);
                }
            }
        }

        // 2. Restore Students - strictly scoped
        if (data.students && Array.isArray(data.students)) {
            const validStudents = data.students.filter((s: any) => s.schoolId === adminUser.schoolId);
            for (const student of validStudents) {
                const { data: existing } = await supabaseAdmin.from('Student').select('id, schoolId').eq('id', student.id).maybeSingle();
                if (!existing) {
                    await supabaseAdmin.from('Student').insert(student);
                    restoredStudents++;
                } else if (existing.schoolId === adminUser.schoolId) {
                    await supabaseAdmin.from('Student').update(student).eq('id', student.id);
                }
            }
        }

        // 3. Restore Classes - strictly scoped
        if (data.classes && Array.isArray(data.classes)) {
            const validClasses = data.classes.filter((cls: any) => !cls.schoolId || cls.schoolId === adminUser.schoolId);
            for (const cls of validClasses) {
                const { data: existing } = await supabaseAdmin.from('Class').select('id').eq('id', cls.id).maybeSingle();
                if (!existing) {
                    await supabaseAdmin.from('Class').insert({ ...cls, schoolId: adminUser.schoolId });
                    restoredClasses++;
                } else {
                    await supabaseAdmin.from('Class').update({ ...cls, schoolId: adminUser.schoolId }).eq('id', cls.id);
                }
            }
        }

        // 4. Upsert Grades, Subjects, Invoices, Payments strictly scoped to this school
        if (data.grades && Array.isArray(data.grades)) {
            const validGrades = data.grades.filter((g: any) => g.schoolId === adminUser.schoolId);
            if (validGrades.length > 0) {
                await supabaseAdmin.from('Grade').upsert(validGrades);
            }
        }
        if (data.subjects && Array.isArray(data.subjects)) {
            const validSubjects = data.subjects.filter((s: any) => s.schoolId === adminUser.schoolId);
            if (validSubjects.length > 0) {
                await supabaseAdmin.from('Subject').upsert(validSubjects);
            }
        }

        const validInvoiceIds = new Set<string>();
        if (data.invoices && Array.isArray(data.invoices)) {
            const validInvoices = data.invoices.filter((inv: any) => inv.schoolId === adminUser.schoolId);
            validInvoices.forEach((inv: any) => validInvoiceIds.add(inv.id));
            if (validInvoices.length > 0) {
                await supabaseAdmin.from('Invoice').upsert(validInvoices);
            }
        }

        if (data.payments && Array.isArray(data.payments)) {
            const validPayments = data.payments.filter((p: any) => validInvoiceIds.has(p.invoiceId));
            if (validPayments.length > 0) {
                await supabaseAdmin.from('Payment').upsert(validPayments);
            }
        }

        // Audit log with mandatory schoolId
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({
                userId: adminUser.id,
                schoolId: adminUser.schoolId,
                action: 'RESTORE_BACKUP',
                resourceType: 'BACKUP',
                ip: _ip || undefined,
                after: { restoredUsers, restoredStudents, restoredClasses }
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({ 
            success: true, 
            message: `Restored ${restoredUsers} missing users, ${restoredStudents} missing students, ${restoredClasses} missing classes, and resynced all records.` 
        });

    } catch (error: any) {
        console.error("Backup Restore Error:", error);
        return NextResponse.json({ error: publicErrorMessage(error, 'Failed to restore backup') }, { status: 500 });
    }
}
