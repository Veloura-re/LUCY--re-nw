import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';

export const BACKUP_BUCKET = 'school-backups';
/** Automatic daily backups are kept this long. */
export const CRON_BACKUP_RETENTION_DAYS = 30;
/** Backups a person chose to take are kept longer. */
export const MANUAL_BACKUP_RETENTION_DAYS = 90;
/** The newest backups of each school are never removed, however old. */
export const MIN_BACKUPS_KEPT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BackupPoint {
    id: string;
    schoolId: string;
    triggeredBy: string;
    createdAt: Date;
    filePath: string | null;
    fileUrl: string;
}

/** Storage path of a backup: the recorded path, or for older rows the one inside the signed URL. */
export function backupObjectPath(point: { filePath?: string | null; fileUrl?: string | null }): string | null {
    if (point.filePath) return point.filePath;
    const match = point.fileUrl?.match(/\/object\/sign\/school-backups\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/** Which backups have outlived retention. Pure so it can be tested without a database. */
export function selectExpiredBackups<T extends BackupPoint>(points: T[], now: Date = new Date()): T[] {
    const bySchool = new Map<string, T[]>();
    for (const point of points) bySchool.set(point.schoolId, [...(bySchool.get(point.schoolId) ?? []), point]);

    const expired: T[] = [];
    for (const schoolPoints of bySchool.values()) {
        const older = schoolPoints
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(MIN_BACKUPS_KEPT);
        for (const point of older) {
            const days = point.triggeredBy === 'SYSTEM_CRON' ? CRON_BACKUP_RETENTION_DAYS : MANUAL_BACKUP_RETENTION_DAYS;
            if (now.getTime() - point.createdAt.getTime() > days * DAY_MS) expired.push(point);
        }
    }
    return expired;
}

/**
 * Deletes expired backups: the stored file first, then the row, so a failed file removal is
 * retried on the next run instead of leaving an orphaned file. Only objects under the school's own
 * folder are touched; the audit archive (`purged-schools/`) lives in the same bucket and is never swept.
 * Returns the number of restore points removed.
 */
export async function pruneExpiredBackups(now: Date = new Date()): Promise<number> {
    // shortcut: loads every restore point; fine at one row per school per day, page it if this grows past ~100k rows.
    const points = await prisma.restorePoint.findMany({
        select: { id: true, schoolId: true, triggeredBy: true, createdAt: true, filePath: true, fileUrl: true },
    });

    const storage = createAdminClient().storage.from(BACKUP_BUCKET);
    let removed = 0;

    for (const point of selectExpiredBackups(points, now)) {
        const path = backupObjectPath(point);
        if (path) {
            if (!path.startsWith(`${point.schoolId}/`)) continue;
            const { error } = await storage.remove([path]);
            if (error) continue;
        }
        await prisma.restorePoint.delete({ where: { id: point.id } });
        removed++;
    }
    return removed;
}
