import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

const ARCHIVE_BUCKET = 'school-backups';
const PAGE_SIZE = 5000;
const MAX_ROWS = 500000;

export interface AuditArchiveResult {
    path: string;
    count: number;
}

/**
 * Writes a school's complete audit trail to private storage as JSON.
 *
 * Deleting a tenant removes its users, and AuditLog.userId is a required foreign key, so the
 * entries cannot survive in the database. The purge must therefore archive them first and abort
 * if the archive cannot be written.
 */
export async function archiveSchoolAuditTrail(schoolId: string): Promise<AuditArchiveResult> {
    const users = await prisma.user.findMany({ where: { schoolId }, select: { id: true } });
    const userIds = users.map((u) => u.id);

    const where = { OR: [{ schoolId }, ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : [])] };
    const rows: unknown[] = [];
    let cursor: string | undefined;

    while (rows.length < MAX_ROWS) {
        const page = await prisma.auditLog.findMany({
            where,
            orderBy: { id: 'asc' },
            take: PAGE_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });
        if (page.length === 0) break;
        rows.push(...page);
        cursor = page[page.length - 1].id;
        if (page.length < PAGE_SIZE) break;
    }

    const path = `purged-schools/${schoolId}/audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const payload = JSON.stringify({ schoolId, archivedAt: new Date().toISOString(), count: rows.length, entries: rows });

    const admin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let { error } = await admin.storage
        .from(ARCHIVE_BUCKET)
        .upload(path, new Blob([payload], { type: 'application/json' }), { contentType: 'application/json', upsert: false });

    if (error) {
        // Create the private bucket on first use, then retry once.
        await admin.storage.createBucket(ARCHIVE_BUCKET, { public: false }).catch(() => undefined);
        ({ error } = await admin.storage
            .from(ARCHIVE_BUCKET)
            .upload(path, new Blob([payload], { type: 'application/json' }), { contentType: 'application/json', upsert: false }));
    }

    if (error) {
        throw new Error('Audit trail archive failed; the school was not deleted');
    }

    return { path, count: rows.length };
}

const SCHOOL_FILE_BUCKETS = ['school-backups', 'books', 'school-assets'];

/**
 * Removes a purged school's stored files: its backups and uploaded materials. The audit archive
 * lives under `purged-schools/` and is deliberately left alone. Returns the number of objects removed.
 */
export async function purgeSchoolFiles(schoolId: string): Promise<number> {
    const admin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Folders come back as entries without an id, so descend into them (bounded depth).
    const listPaths = async (bucket: string, prefix: string, depth = 0): Promise<string[]> => {
        if (depth > 6) return [];
        const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
        const paths: string[] = [];
        for (const entry of data ?? []) {
            const path = `${prefix}/${entry.name}`;
            if (entry.id) paths.push(path);
            else paths.push(...(await listPaths(bucket, path, depth + 1)));
        }
        return paths;
    };

    let removed = 0;
    for (const bucket of SCHOOL_FILE_BUCKETS) {
        const paths = await listPaths(bucket, schoolId);
        for (let i = 0; i < paths.length; i += 100) {
            const batch = paths.slice(i, i + 100);
            const { error } = await admin.storage.from(bucket).remove(batch);
            if (error) throw error;
            removed += batch.length;
        }
    }
    return removed;
}
