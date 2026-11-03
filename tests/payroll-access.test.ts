/**
 * Authorization tests for /api/director/payroll: finance roles only, payees limited to the caller's school.
 */
const mockRequireRole = jest.fn();
const created: any[] = [];
const staff: Record<string, { id: string; schoolId: string }> = {
    'teacher-a': { id: 'teacher-a', schoolId: 'school-a' },
    'teacher-b': { id: 'teacher-b', schoolId: 'school-b' },
};

jest.mock('@/lib/security', () => ({
    FINANCE_ROLES: ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'ACCOUNTANT'],
    requireRole: (...args: any[]) => mockRequireRole(...args),
    publicErrorMessage: (e: any) => String(e?.message || e),
    clientDataError: () => null,
    handleApiError: (e: any) =>
        new Response(JSON.stringify({ error: String(e?.message) }), { status: String(e?.message).startsWith('Forbidden') ? 403 : 500 }),
}));
jest.mock('@/lib/with-audit', () => ({ withAudit: (handler: any) => handler }));
jest.mock('@/lib/error-capture', () => ({ reportServerError: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findFirst: async ({ where }: any) => {
                const u = staff[where.id];
                return u && u.schoolId === where.schoolId ? { id: u.id } : null;
            },
        },
        staffPayroll: {
            create: async ({ data }: any) => { created.push(data); return { id: 'pay-1', ...data }; },
            findMany: async () => [],
        },
    },
}));

import { POST, GET } from '@/app/api/director/payroll/route';

const body = (over: Record<string, unknown> = {}) =>
    new Request('http://localhost/api/director/payroll', {
        method: 'POST',
        body: JSON.stringify({ userId: 'teacher-a', amount: 5000, periodStart: '2026-10-01', periodEnd: '2026-10-31', ...over }),
    });

beforeEach(() => {
    created.length = 0;
    mockRequireRole.mockReset();
    mockRequireRole.mockResolvedValue({ id: 'acc-1', role: 'ACCOUNTANT', schoolId: 'school-a' });
});

test('an accountant can pay staff of their own school', async () => {
    const res = await POST(body());
    expect(res.status).toBe(200);
    expect(created).toHaveLength(1);
});

test('an owner is allowed', async () => {
    mockRequireRole.mockResolvedValue({ id: 'own-1', role: 'OWNER', schoolId: 'school-a' });
    expect((await POST(body())).status).toBe(200);
});

test('a payee from another school is rejected', async () => {
    const res = await POST(body({ userId: 'teacher-b' }));
    expect(res.status).toBe(404);
    expect(created).toHaveLength(0);
});

test('non-positive amounts and bad dates are rejected', async () => {
    expect((await POST(body({ amount: -5 }))).status).toBe(400);
    expect((await POST(body({ periodStart: 'nope' }))).status).toBe(400);
    expect(created).toHaveLength(0);
});

test('roles outside finance are forbidden', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'));
    expect((await POST(body())).status).toBe(403);
    expect((await GET()).status).toBe(403);
});
