import { BACKUP_USER_SELECT } from '@/lib/backup-restore';
import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage, handleApiError, clientDataError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/audit';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { reportServerError } from '@/lib/error-capture';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch all critical data type-safely via Prisma to prevent schema drift and missing records
        const [users, students, grades, subjects, invoices, classes, payments] = await Promise.all([
            prisma.user.findMany({ where: { schoolId: user.schoolId }, select: BACKUP_USER_SELECT }),
            prisma.student.findMany({ where: { schoolId: user.schoolId } }),
            prisma.grade.findMany({ where: { schoolId: user.schoolId } }),
            prisma.subject.findMany({ where: { schoolId: user.schoolId } }),
            prisma.invoice.findMany({ where: { schoolId: user.schoolId } }),
            prisma.class.findMany({
                where: {
                    OR: [
                        { schoolId: user.schoolId },
                        { grade: { schoolId: user.schoolId } }
                    ]
                }
            }),
            prisma.payment.findMany({
                where: {
                    invoice: { schoolId: user.schoolId }
                }
            })
        ]);

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
            filePath: fileName,
            sizeBytes: buffer.length,
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
            metadata: backupData.metadata
        }).select().single();

        if (rpError) throw rpError;

        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
        await logActivity({
            userId: user.id,
            schoolId: user.schoolId,
            action: 'GENERATE_BACKUP',
            resourceType: 'RESTORE_POINT',
            resourceId: restorePoint?.id,
            ip,
            after: { sizeBytes: buffer.length, filePath: fileName }
        });

        return NextResponse.json({ success: true, restorePoint });
    } catch (error: any) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Backup Generation Error:", error);
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error, 'Failed to generate backup') }, { status: 500 });
    }
}
