jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({}) }));

import { backupObjectPath, selectExpiredBackups, type BackupPoint } from '@/lib/backup-retention';

const NOW = new Date('2026-12-01T00:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const point = (id: string, schoolId: string, triggeredBy: string, ageDays: number): BackupPoint => ({
    id,
    schoolId,
    triggeredBy,
    createdAt: daysAgo(ageDays),
    filePath: `${schoolId}/${id}.json`,
    fileUrl: '',
});

const ids = (points: BackupPoint[]) => selectExpiredBackups(points, NOW).map((p) => p.id).sort();

test('daily backups expire after 30 days and manual ones after 90', () => {
    const points = [
        point('new1', 's1', 'SYSTEM_CRON', 1),
        point('new2', 's1', 'SYSTEM_CRON', 2),
        point('new3', 's1', 'SYSTEM_CRON', 3),
        point('cron-old', 's1', 'SYSTEM_CRON', 31),
        point('cron-ok', 's1', 'SYSTEM_CRON', 29),
        point('manual-ok', 's1', 'user-1', 60),
        point('manual-old', 's1', 'user-1', 91),
    ];
    expect(ids(points)).toEqual(['cron-old', 'manual-old']);
});

test('the newest backups of a school are kept even when old', () => {
    const points = [point('a', 's1', 'SYSTEM_CRON', 200), point('b', 's1', 'SYSTEM_CRON', 300), point('c', 's1', 'user-1', 400)];
    expect(ids(points)).toEqual([]);
});

test('schools are counted separately', () => {
    const stale = ['a', 'b', 'c', 'd'].map((id, i) => point(id, 's1', 'SYSTEM_CRON', 100 + i));
    const other = [point('x', 's2', 'SYSTEM_CRON', 500)];
    expect(ids([...stale, ...other])).toEqual(['d']);
});

test('object path comes from filePath or, for old rows, from the signed URL', () => {
    expect(backupObjectPath({ filePath: 's1/a.json', fileUrl: 'ignored' })).toBe('s1/a.json');
    expect(
        backupObjectPath({ filePath: null, fileUrl: 'https://x.supabase.co/storage/v1/object/sign/school-backups/s1/backup_cron_2026-01-01T00-00-00-000Z.json?token=abc' })
    ).toBe('s1/backup_cron_2026-01-01T00-00-00-000Z.json');
    expect(backupObjectPath({ filePath: null, fileUrl: '' })).toBeNull();
});
