const mockRequireRole = jest.fn();
jest.mock('@/lib/security', () => ({ requireRole: (...a: any[]) => mockRequireRole(...a), handleApiError: () => new Response('{}', { status: 500 }) }));
jest.mock('@/lib/prisma', () => ({ prisma: { school: { findUnique: jest.fn() } } }));
jest.mock('@/lib/fx', () => ({ quoteUsdInEtb: jest.fn() }));
jest.mock('@/lib/audit', () => ({ logActivity: jest.fn(), getIp: () => undefined }));

import { GET, POST } from '@/app/api/school/billing/chapa-checkout/route';

beforeEach(() => mockRequireRole.mockResolvedValue({ id: 'o1', role: 'OWNER', schoolId: 's1' }));

test('Chapa checkout and its price quote answer 503 while it is being built', async () => {
    expect((await GET()).status).toBe(503);
    expect((await POST(new Request('http://localhost/api/school/billing/chapa-checkout', { method: 'POST' }))).status).toBe(503);
});
