import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { safeEqual } from '@/lib/security';

// Invoked by the scheduler with "Authorization: Bearer <CRON_SECRET>".
// The secret is mandatory: an unset secret disables the endpoint instead of opening it.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('[Cron Backup] CRON_SECRET is not configured; refusing to run.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!safeEqual(authHeader, `Bearer ${secret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch all ACTIVE schools
        const schools = await prisma.school.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true }
        });

        if (!schools || schools.length === 0) {
            return NextResponse.json({ success: true, message: 'No active schools to backup' });
        }

        let successCount = 0;
        let failCount = 0;

        // 2. Iterate and backup
        for (const school of schools) {
            try {
                const schoolId = school.id;
                
                const [users, students, grades, subjects, invoices, classes, payments] = await Promise.all([
                    prisma.user.findMany({ where: { schoolId } }),
                    prisma.student.findMany({ where: { schoolId } }),
                    prisma.grade.findMany({ where: { schoolId } }),
                    prisma.subject.findMany({ where: { schoolId } }),
                    prisma.invoice.findMany({ where: { schoolId } }),
                    prisma.class.findMany({
                        where: {
                            OR: [
                                { schoolId },
                                { grade: { schoolId } }
                            ]
                        }
                    }),
                    prisma.payment.findMany({
                        where: {
                            invoice: { schoolId }
                        }
                    })
                ]);

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
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
