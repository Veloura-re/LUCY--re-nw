import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch all critical data
        const { data: users } = await supabaseAdmin.from('User').select('*').eq('schoolId', user.schoolId);
        const { data: students } = await supabaseAdmin.from('Student').select('*').eq('schoolId', user.schoolId);
        const { data: classes } = await supabaseAdmin.from('Class').select('*').eq('schoolId', user.schoolId);
        const { data: grades } = await supabaseAdmin.from('Grade').select('*').eq('schoolId', user.schoolId);
        const { data: subjects } = await supabaseAdmin.from('Subject').select('*').eq('schoolId', user.schoolId);
        const { data: invoices } = await supabaseAdmin.from('Invoice').select('*').eq('schoolId', user.schoolId);
        const { data: payments } = await supabaseAdmin.from('Payment').select('*').eq('schoolId', user.schoolId);

        const backupData = {
            metadata: {
                schoolId: user.schoolId,
                timestamp: new Date().toISOString(),
                version: "1.0",
                triggeredBy: user.id
            },
            data: {
                users: users || [],
                students: students || [],
                classes: classes || [],
                grades: grades || [],
                subjects: subjects || [],
                invoices: invoices || [],
                payments: payments || []
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const buffer = Buffer.from(jsonString, 'utf-8');
        const fileName = `${user.schoolId}/backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        // 2. Ensure bucket exists and upload
        // Supabase storage bucket creation is tricky via REST if it exists. We'll just try to upload.
        // It relies on 'school-backups' bucket existing.
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('school-backups')
            .upload(fileName, buffer, {
                contentType: 'application/json',
                upsert: true
            });

        if (uploadError) {
            // If bucket doesn't exist, create it then retry
            if (uploadError.message.includes('Bucket not found')) {
                await supabaseAdmin.storage.createBucket('school-backups', { public: false });
                const retry = await supabaseAdmin.storage.from('school-backups').upload(fileName, buffer, { contentType: 'application/json', upsert: true });
                if (retry.error) throw retry.error;
            } else {
                throw uploadError;
            }
        }

        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
            .storage
            .from('school-backups')
            .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days valid for download

        const fileUrl = signedUrlData?.signedUrl || '';

        // 3. Create RestorePoint record
        const { data: restorePoint, error: rpError } = await supabaseAdmin.from('RestorePoint').insert({
            id: globalThis.crypto.randomUUID(),
            schoolId: user.schoolId,
            triggeredBy: user.id,
            fileUrl,
            sizeBytes: buffer.length,
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
            metadata: backupData.metadata
        }).select().single();

        if (rpError) throw rpError;

        return NextResponse.json({ success: true, restorePoint });
    } catch (error: any) {
        console.error("Backup Generation Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to generate backup' }, { status: 500 });
    }
}
