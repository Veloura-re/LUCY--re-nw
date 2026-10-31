/**
 * Runs the real consent, retention and staff-invitation code against a real Postgres.
 * Skipped unless TEST_DATABASE_URL points at a disposable database whose schema matches prisma/schema.prisma:
 *   TEST_DATABASE_URL=postgresql://... npx jest tests/integration/staff-and-retention
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.TEST_DATABASE_URL;
const db = url ? new PrismaClient({ datasources: { db: { url } } }) : (null as unknown as PrismaClient);

jest.mock('@/lib/prisma', () => ({ get prisma() { return db; } }));
const mockRemove = jest.fn(async (_paths: string[]) => ({ error: null }));
jest.mock('@/utils/supabase/admin', () => ({
    createAdminClient: () => ({ storage: { from: () => ({ remove: mockRemove }) } }),
}));
const mockRequireRole = jest.fn();
jest.mock('@/lib/security', () => ({
    ...jest.requireActual('@/lib/security'),
    requireRole: (...a: unknown[]) => mockRequireRole(...a),
    handleApiError: (e: unknown) => new Response(JSON.stringify({ error: String(e) }), { status: 500 }),
}));
jest.mock('@/lib/rate-limit', () => ({ rateLimitShared: async () => null }));
const mockSendInvite = jest.fn(async () => ({ success: true }));
jest.mock('@/lib/email', () => ({ sendInviteEmail: (...a: unknown[]) => mockSendInvite(...(a as [])) }));

import { storeConsent } from '@/lib/consent';
import { LEGAL_VERSION } from '@/lib/legal-versions';
import { purgeExpiredSanctuarySessions, purgeUnreportedMessages } from '@/lib/sanctuary-retention';
import { pruneExpiredBackups } from '@/lib/backup-retention';
import { DELETE, GET, POST } from '@/app/api/school/staff-roles/route';

const describeDb = url ? describe : describe.skip;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const post = (body: unknown) => POST(new Request('http://localhost/api/school/staff-roles', { method: 'POST', body: JSON.stringify(body) }));

describeDb('against a real database', () => {
    let schoolA: string, schoolB: string, directorA: string, directorB: string;

    beforeAll(async () => {
        const a = await db.school.create({ data: { name: 'School A', schoolCode: `A-${Date.now()}` } });
        const b = await db.school.create({ data: { name: 'School B', schoolCode: `B-${Date.now()}` } });
        schoolA = a.id; schoolB = b.id;
        directorA = (await db.user.create({ data: { email: `dirA-${Date.now()}@x.test`, name: 'Dir A', role: 'PRINCIPAL', schoolId: schoolA, verified: true } })).id;
        directorB = (await db.user.create({ data: { email: `dirB-${Date.now()}@x.test`, name: 'Dir B', role: 'PRINCIPAL', schoolId: schoolB, verified: true } })).id;
    });
    afterAll(async () => { await db?.$disconnect(); });
    beforeEach(() => jest.clearAllMocks());

    test('consent: stored once per version and removed with the user', async () => {
        const u = await db.user.create({ data: { email: `c-${Date.now()}@x.test`, name: 'C', role: 'RECORDER', schoolId: schoolA } });
        expect(await storeConsent(db, { userId: u.id, source: 'register-invite' })).toBe(true);
        expect(await storeConsent(db, { userId: u.id, source: 'login' })).toBe(false);
        expect(await db.consentRecord.count({ where: { userId: u.id } })).toBe(2);
        expect((await db.user.findUnique({ where: { id: u.id } }))?.legalVersionAccepted).toBe(LEGAL_VERSION);
        await db.user.delete({ where: { id: u.id } });
        expect(await db.consentRecord.count({ where: { userId: u.id } })).toBe(0);
    });

    test('sanctuary: unreported messages go at session end, reported ones stay until expiry', async () => {
        const mk = async (status: 'ENDED' | 'FLAGGED', ageDays: number) => db.sanctuarySession.create({
            data: { status, userAId: 'ua', userASchoolId: schoolA, userARole: 'STUDENT', userAPseudo: 'A', createdAt: daysAgo(ageDays), messages: { create: [{ senderId: 'ua', senderName: 'A', senderRole: 'STUDENT', content: 'hi' }] } },
        });
        const plain = await mk('ENDED', 1);
        const reported = await mk('ENDED', 1);
        await db.sanctuaryReport.create({ data: { sessionId: reported.id, reporterId: 'ub', reportedId: 'ua', reason: 'abuse', transcript: [] } });
        const old = await mk('ENDED', 40);

        await purgeUnreportedMessages({ id: plain.id });
        await purgeUnreportedMessages({ id: reported.id });
        expect(await db.sanctuaryMessage.count({ where: { sessionId: plain.id } })).toBe(0);
        expect(await db.sanctuaryMessage.count({ where: { sessionId: reported.id } })).toBe(1);

        await purgeExpiredSanctuarySessions();
        expect(await db.sanctuarySession.findUnique({ where: { id: old.id } })).toBeNull();
        expect(await db.sanctuaryMessage.count({ where: { sessionId: old.id } })).toBe(0);
        expect(await db.sanctuarySession.findUnique({ where: { id: reported.id } })).not.toBeNull();
    });

    test('backups: expired restore points and their files are removed, the newest three stay', async () => {
        const mk = (id: string, ageDays: number, triggeredBy: string) => db.restorePoint.create({
            data: { id, schoolId: schoolA, triggeredBy, fileUrl: 'x', filePath: `${schoolA}/${id}.json`, sizeBytes: 1, createdAt: daysAgo(ageDays) },
        });
        await Promise.all([mk('b-new1', 1, 'SYSTEM_CRON'), mk('b-new2', 2, 'SYSTEM_CRON'), mk('b-new3', 3, 'SYSTEM_CRON'), mk('b-cron-old', 31, 'SYSTEM_CRON'), mk('b-manual-ok', 60, directorA), mk('b-manual-old', 95, directorA)]);
        const removed = await pruneExpiredBackups();
        expect(removed).toBe(2);
        expect(mockRemove.mock.calls.flat(2).sort()).toEqual([`${schoolA}/b-cron-old.json`, `${schoolA}/b-manual-old.json`]);
        expect((await db.restorePoint.findMany({ where: { schoolId: schoolA }, select: { id: true } })).map(r => r.id).sort()).toEqual(['b-manual-ok', 'b-new1', 'b-new2', 'b-new3']);
    });

    test('staff invitations: roles, tenant scoping and revocation', async () => {
        mockRequireRole.mockResolvedValue({ id: directorA, role: 'PRINCIPAL', schoolId: schoolA });

        expect((await post({ email: 'bad', role: 'ACCOUNTANT' })).status).toBe(400);
        expect((await post({ email: 'x@y.test', role: 'PRINCIPAL' })).status).toBe(400);

        const ok = await post({ email: 'Acct@School.test ', role: 'ACCOUNTANT' });
        expect(ok.status).toBe(200);
        expect(mockSendInvite).toHaveBeenCalledWith('acct@school.test', expect.stringContaining('/invite/inv_'), 'School A', expect.any(String), 'ACCOUNTANT', schoolA);
        expect((await post({ email: 'rec@school.test', role: 'RECORDER' })).status).toBe(200);

        // An email that already belongs to another school is refused.
        await db.user.create({ data: { email: 'taken@b.test', name: 'T', role: 'TEACHER', schoolId: schoolB, verified: true } });
        expect((await post({ email: 'taken@b.test', role: 'RECORDER' })).status).toBe(400);

        const listed = (await (await GET()).json()) as { invites: { id: string; role: string; email: string }[]; staff: unknown[] };
        expect(listed.invites.map(i => `${i.email}:${i.role}`).sort()).toEqual(['acct@school.test:ACCOUNTANT', 'rec@school.test:RECORDER']);

        // Director B can neither see nor revoke school A's invitations.
        mockRequireRole.mockResolvedValue({ id: directorB, role: 'PRINCIPAL', schoolId: schoolB });
        expect(((await (await GET()).json()) as { invites: unknown[] }).invites).toHaveLength(0);
        const inviteId = listed.invites[0].id;
        expect((await DELETE(new Request(`http://localhost/api/school/staff-roles?inviteId=${inviteId}`, { method: 'DELETE' }))).status).toBe(404);

        mockRequireRole.mockResolvedValue({ id: directorA, role: 'PRINCIPAL', schoolId: schoolA });
        expect((await DELETE(new Request(`http://localhost/api/school/staff-roles?inviteId=${inviteId}`, { method: 'DELETE' }))).status).toBe(200);
        expect(await db.inviteToken.count({ where: { schoolId: schoolA } })).toBe(1);
        expect(await db.auditLog.count({ where: { schoolId: schoolA, action: { in: ['INVITE_STAFF_ROLE', 'REVOKE_STAFF_INVITE'] } } })).toBe(3);
    });
});
