import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// Vercel Cron will call this endpoint daily.
// Ensure it's secured via CRON_SECRET or Vercel's authorization header.
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !request.url.includes('localhost')) {
        // Vercel Cron sends a Bearer token matching CRON_SECRET
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch all ACTIVE schools
        const { data: schools } = await supabaseAdmin.from('School').select('id').eq('status', 'ACTIVE');
        if (!schools || schools.length === 0) {
            return NextResponse.json({ success: true, message: 'No active schools to backup' });
        }

        let successCount = 0;
        let failCount = 0;

        // 2. Iterate and backup
        for (const school of schools) {
            try {
                const schoolId = school.id;
                
                const { data: users } = await supabaseAdmin.from('User').select('*').eq('schoolId', schoolId);
                const { data: students } = await supabaseAdmin.from('Student').select('*').eq('schoolId', schoolId);
                const { data: classes } = await supabaseAdmin.from('Class').select('*').eq('schoolId', schoolId);
                const { data: grades } = await supabaseAdmin.from('Grade').select('*').eq('schoolId', schoolId);
                const { data: subjects } = await supabaseAdmin.from('Subject').select('*').eq('schoolId', schoolId);
                const { data: invoices } = await supabaseAdmin.from('Invoice').select('*').eq('schoolId', schoolId);
                const { data: payments } = await supabaseAdmin.from('Payment').select('*').eq('schoolId', schoolId);

                const backupData = {
                    metadata: {
                        schoolId,
                        timestamp: new Date().toISOString(),
                        version: "1.0",
                        triggeredBy: "SYSTEM_CRON"
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
                const fileName = `${schoolId}/backup_cron_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

                const { error: uploadError } = await supabaseAdmin
                    .storage
                    .from('school-backups')
                    .upload(fileName, buffer, {
                        contentType: 'application/json',
                        upsert: true
                    });

                if (uploadError) {
                    if (uploadError.message.includes('Bucket not found')) {
                        await supabaseAdmin.storage.createBucket('school-backups', { public: false });
                        await supabaseAdmin.storage.from('school-backups').upload(fileName, buffer, { contentType: 'application/json', upsert: true });
                    } else {
                        throw uploadError;
                    }
                }

                const { data: signedUrlData } = await supabaseAdmin
                    .storage
                    .from('school-backups')
                    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

                const fileUrl = signedUrlData?.signedUrl || '';

                await supabaseAdmin.from('RestorePoint').insert({
                    id: globalThis.crypto.randomUUID(),
                    schoolId,
                    triggeredBy: "SYSTEM_CRON",
                    fileUrl,
                    sizeBytes: buffer.length,
                    status: "COMPLETED",
                    createdAt: new Date().toISOString(),
                    metadata: backupData.metadata
                });

                successCount++;
            } catch (err) {
                console.error(`Cron backup failed for school ${school.id}:`, err);
                failCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Cron backup completed. Success: ${successCount}, Failed: ${failCount}` 
        });
    } catch (error: any) {
        console.error("Cron Backup Error:", error);
        return NextResponse.json({ error: error.message || 'Cron failed' }, { status: 500 });
    }
}
