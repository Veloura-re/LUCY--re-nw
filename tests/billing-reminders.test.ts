const mockSchools = jest.fn();
const mockUsers = jest.fn();
const mockAuditFind = jest.fn();
const mockAuditCreate = jest.fn();
const mockUserFirst = jest.fn();
const mockSend = jest.fn();

jest.mock('@/lib/prisma', () => ({
    prisma: {
        school: { findMany: (...a: any[]) => mockSchools(...a) },
        user: { findMany: (...a: any[]) => mockUsers(...a), findFirst: (...a: any[]) => mockUserFirst(...a) },
        auditLog: { findFirst: (...a: any[]) => mockAuditFind(...a), create: (...a: any[]) => mockAuditCreate(...a) },
    },
}));
jest.mock('@/lib/email', () => ({ sendEmail: (...a: any[]) => mockSend(...a) }));
jest.mock('@/lib/fx', () => ({ quoteUsdInEtb: async () => ({ amountEtb: 8080, rate: 161.49, source: 'test', marginPercent: 2 }) }));
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => ({}) }));
jest.mock('@/lib/users', () => ({ getCachedUser: jest.fn() }));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

import { GET } from '@/app/api/cron/billing-reminders/route';
import { DAY_MS } from '@/lib/billing';

const call = (auth = 'Bearer cron-secret') =>
    GET(new Request('https://x.test/api/cron/billing-reminders', { headers: { authorization: auth } }));
const school = (id: string, daysLeft: number, extra: any = {}) => ({
    id, name: `School ${id}`, createdAt: new Date(Date.now() - 400 * DAY_MS),
    trialEndsAt: new Date(Date.now() + daysLeft * DAY_MS - 60_000), subscriptionStatus: 'inactive', stripeSubscriptionId: null, ...extra,
});

beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
    mockAuditFind.mockResolvedValue(null);
    mockUsers.mockResolvedValue([{ email: 'owner@school.test' }]);
    mockUserFirst.mockResolvedValue({ id: 'owner-1' });
    mockSend.mockResolvedValue({ success: true });
});

test('rejects calls without the cron secret', async () => {
    expect((await call('Bearer wrong')).status).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await call('Bearer undefined')).status).toBe(401);
    expect(mockSchools).not.toHaveBeenCalled();
});

test('sends a reminder at 7, 3 and 1 days and no other day', async () => {
    mockSchools.mockResolvedValue([school('a', 7), school('b', 3), school('c', 1), school('d', 5), school('e', -2)]);
    const body = await (await call()).json();
    expect(body.sent).toBe(3);
    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockAuditCreate.mock.calls.map(c => c[0].data.action)).toEqual(Array(3).fill('BILLING_REMINDER_SENT'));
});

test('skips card subscribers who renew automatically', async () => {
    mockSchools.mockResolvedValue([school('a', 7, { stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' })]);
    await call();
    expect(mockSend).not.toHaveBeenCalled();
});

test('does not send the same reminder twice', async () => {
    mockSchools.mockResolvedValue([school('a', 3)]);
    mockAuditFind.mockResolvedValue({ id: 'already-sent' });
    const body = await (await call()).json();
    expect(body.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
});

test('includes the birr amount and escapes the school name', async () => {
    mockSchools.mockResolvedValue([{ ...school('a', 7), name: '<b>Evil</b> Academy' }]);
    await call();
    const { html, subject } = mockSend.mock.calls[0][0];
    expect(html).toContain('8,080 ETB');
    expect(html).not.toContain('<b>Evil</b>');
    expect(subject).toContain('7 days');
});
