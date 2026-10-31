import { NextResponse } from 'next/server';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { canReadStoragePath, isFileBucket } from '@/lib/storage-files';
import { createAdminClient } from '@/utils/supabase/admin';

/** Sends an authorized member of the owning school to a short-lived signed URL for a private file. */
export async function GET(_request: Request, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
    try {
        const dbUser = await requireSchoolLinked();
        const { bucket, path } = await params;
        const objectPath = path.join('/');

        if (!isFileBucket(bucket) || !canReadStoragePath(dbUser, objectPath)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const { data, error } = await createAdminClient().storage.from(bucket).createSignedUrl(objectPath, 300);
        if (error || !data?.signedUrl) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const response = NextResponse.redirect(data.signedUrl, 302);
        // Shorter than the signed lifetime so a cached redirect never points at an expired link.
        response.headers.set('Cache-Control', 'private, max-age=240');
        return response;
    } catch (e) {
        return handleApiError(e);
    }
}
