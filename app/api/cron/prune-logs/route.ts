import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCron } from '@/lib/security';
import { reportServerError } from '@/lib/error-capture';
import { purgeExpiredSanctuarySessions } from '@/lib/sanctuary-retention';
import { pruneExpiredBackups } from '@/lib/backup-retention';

/** Error log entries older than this are removed. Audit logs are compliance records and are never pruned here. */
const ERROR_LOG_RETENTION_DAYS = 90;

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cutoff = new Date(Date.now() - ERROR_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const result = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
        const sanctuary = await purgeExpiredSanctuarySessions();
        const backupsRemoved = await pruneExpiredBackups();
        return NextResponse.json({ success: true, deleted: result.count, sanctuarySessionsDeleted: sanctuary.count, backupsRemoved, olderThan: cutoff.toISOString() });
    } catch (error) {
        console.error('[Cron Prune Logs] Failed:', error);
        void reportServerError(error, { type: 'cron_failure', status: 500, context: { job: 'prune-logs' } });
        return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
    }
}
