import { createAdminClient } from '@/utils/supabase/admin';
import { parseFileRef } from './storage-refs';

export * from './storage-refs';

/**
 * Signs a stored reference for server-rendered pages that are reachable without a session
 * (invite and verification pages, which are protected by their own token). Returns the input
 * unchanged when it is not one of our references, and null when the object cannot be signed.
 */
export async function signStoredFile(ref: string | null | undefined, seconds = 3600): Promise<string | null> {
    if (!ref) return null;
    const parsed = parseFileRef(ref);
    if (!parsed) return ref;
    const { data, error } = await createAdminClient().storage.from(parsed.bucket).createSignedUrl(parsed.path, seconds);
    return error || !data?.signedUrl ? null : data.signedUrl;
}
