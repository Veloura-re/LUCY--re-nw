import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage, handleApiError, clientDataError } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { reportServerError } from '@/lib/error-capture';
import { BACKUP_BUCKET, backupObjectPath } from '@/lib/backup-retention';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: restorePoints, error } = await supabaseAdmin
            .from('RestorePoint')
            .select('*')
            .eq('schoolId', user.schoolId)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        // Stored links expire after 7 days, so every listing signs a fresh one from the object path.
        const withLinks = await Promise.all((restorePoints || []).map(async (point) => {
            const path = backupObjectPath(point);
            if (!path) return point;
            const { data } = await supabaseAdmin.storage.from(BACKUP_BUCKET).createSignedUrl(path, 3600);
            return data?.signedUrl ? { ...point, fileUrl: data.signedUrl } : point;
        }));

        return NextResponse.json({ restorePoints: withLinks });
    } catch (error: any) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Fetch Backups Error:", error);
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error, 'Failed to fetch backups') }, { status: 500 });
    }
}
