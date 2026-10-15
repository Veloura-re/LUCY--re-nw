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
