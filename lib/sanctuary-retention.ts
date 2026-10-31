import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Sessions, and any report transcripts attached to them, are removed this long after creation. */
export const SANCTUARY_RETENTION_DAYS = 30;

/**
 * Deletes the messages of ended sessions that nobody reported. Reported sessions keep their
 * messages as evidence until the retention sweep removes the whole session.
 */
export function purgeUnreportedMessages(sessionWhere: Prisma.SanctuarySessionWhereInput) {
    return prisma.sanctuaryMessage.deleteMany({
        where: { session: { ...sessionWhere, status: 'ENDED', reports: { none: {} } } },
    });
}

/** Deletes sessions past retention; messages and reports go with them through the cascade. */
export function purgeExpiredSanctuarySessions(now: Date = new Date()) {
    const cutoff = new Date(now.getTime() - SANCTUARY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    return prisma.sanctuarySession.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
