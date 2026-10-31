const mockDeleteMessages = jest.fn();
const mockDeleteSessions = jest.fn();

jest.mock('@/lib/prisma', () => ({
    prisma: {
        sanctuaryMessage: { deleteMany: (...a: any[]) => mockDeleteMessages(...a) },
        sanctuarySession: { deleteMany: (...a: any[]) => mockDeleteSessions(...a) },
    },
}));

import {
    SANCTUARY_RETENTION_DAYS,
    purgeExpiredSanctuarySessions,
    purgeUnreportedMessages,
} from '@/lib/sanctuary-retention';

beforeEach(() => jest.clearAllMocks());

test('message purge only targets ended sessions without reports', async () => {
    await purgeUnreportedMessages({ id: 's1' });
    expect(mockDeleteMessages).toHaveBeenCalledWith({
        where: { session: { id: 's1', status: 'ENDED', reports: { none: {} } } },
    });
});

test('expiry sweep deletes sessions older than the retention window', async () => {
    const now = new Date('2026-06-30T00:00:00Z');
    await purgeExpiredSanctuarySessions(now);
    const cutoff: Date = mockDeleteSessions.mock.calls[0][0].where.createdAt.lt;
    expect(now.getTime() - cutoff.getTime()).toBe(SANCTUARY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
});
