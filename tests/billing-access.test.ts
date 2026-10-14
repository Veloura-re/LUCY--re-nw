import crypto from 'crypto';

const mockSchoolFind = jest.fn();
const mockSchoolUpdate = jest.fn();
const mockAuditFind = jest.fn();
const mockAuditCreate = jest.fn();
const mockUserFind = jest.fn();

jest.mock('@/lib/prisma', () => {
    const tx = {
        school: { update: (...a: any[]) => mockSchoolUpdate(...a) },
        auditLog: { create: (...a: any[]) => mockAuditCreate(...a) },
    };
    return {
        prisma: {
            school: { findUnique: (...a: any[]) => mockSchoolFind(...a) },
            auditLog: { findFirst: (...a: any[]) => mockAuditFind(...a), create: (...a: any[]) => mockAuditCreate(...a) },
            user: { findFirst: (...a: any[]) => mockUserFind(...a) },
            $transaction: async (fn: any) => fn(tx),
        },
    };
});
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => ({}) }));
jest.mock('@/lib/users', () => ({ getCachedUser: jest.fn() }));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

import { accessEndAfterPurchase, accessEndAfterRenewal, getAccessEnd, remainingAccessDays, DAY_MS } from '@/lib/billing';
import { POST as chapaWebhook } from '@/app/api/webhooks/chapa/route';

const days = (n: number) => n * DAY_MS;

describe('access date helpers', () => {
    test('defaults to a 120-day trial from creation', () => {
        const createdAt = new Date(Date.now() - days(20));
        expect(Math.round((getAccessEnd({ createdAt }) - createdAt.getTime()) / DAY_MS)).toBe(120);
        expect(remainingAccessDays({ createdAt })).toBe(99);
    });

    test('a purchase adds days on top of remaining access', () => {
        const trialEndsAt = new Date(Date.now() + days(50));
        const end = accessEndAfterPurchase({ trialEndsAt }, 30).getTime();
        expect(Math.round((end - trialEndsAt.getTime()) / DAY_MS)).toBe(30);
    });

    test('a purchase after expiry starts from today', () => {
        const trialEndsAt = new Date(Date.now() - days(10));
        const end = accessEndAfterPurchase({ trialEndsAt }, 30).getTime();
        expect(Math.round((end - Date.now()) / DAY_MS)).toBe(30);
    });

    test('a renewal never shortens remaining free trial time', () => {
        const trialEndsAt = new Date(Date.now() + days(110));
        expect(accessEndAfterRenewal({ trialEndsAt }, 35).getTime()).toBe(trialEndsAt.getTime());
    });

    test('a renewal near the end grants the full window without drifting', () => {
        const trialEndsAt = new Date(Date.now() + days(5));
        const end = accessEndAfterRenewal({ trialEndsAt }, 35).getTime();
        expect(Math.round((end - Date.now()) / DAY_MS)).toBe(35);
    });
});

describe('Chapa webhook', () => {
    const secret = 'whsec-test';
    const schoolId = '123e4567-e89b-12d3-a456-426614174000';
    const realFetch = global.fetch;
    const mockFetch = jest.fn();

    const send = async (txRef: string) => {
        const body = JSON.stringify({ event: 'charge.success', data: { status: 'success', tx_ref: txRef } });
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        return chapaWebhook(new Request('https://x.test/api/webhooks/chapa', { method: 'POST', body, headers: { 'chapa-signature': signature } }));
    };
    const verified = (txRef: string, amount = '5880') =>
        mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success', data: { status: 'success', tx_ref: txRef, currency: 'ETB', amount } }) });

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = mockFetch as any;
        process.env.CHAPA_WEBHOOK_SECRET = secret;
        process.env.CHAPA_SECRET_KEY = 'chapa-secret';
        mockSchoolFind.mockResolvedValue({ id: schoolId, trialEndsAt: new Date(Date.now() - days(3)), createdAt: new Date(Date.now() - days(200)) });
        mockAuditFind.mockImplementation(async (args: any) => (args.where.action === 'CHAPA_CHECKOUT_QUOTED' ? null : null));
        mockUserFind.mockResolvedValue({ id: 'owner-1' });
    });
    afterAll(() => { global.fetch = realFetch; });

    test('a verified payment extends access by 30 days and records the transaction', async () => {
        const ref = `tx-${schoolId}-${Date.now()}`;
        verified(ref);
        const res = await send(ref);
        expect(res.status).toBe(200);
        expect(mockSchoolUpdate).toHaveBeenCalledTimes(1);
        const data = mockSchoolUpdate.mock.calls[0][0].data;
        expect(Math.round((data.trialEndsAt.getTime() - Date.now()) / DAY_MS)).toBe(30);
        expect(mockAuditCreate.mock.calls[0][0].data).toMatchObject({ action: 'CHAPA_PAYMENT_CONFIRMED', resourceId: ref, schoolId });
    });

    test('a redelivered webhook does not extend access twice', async () => {
        const ref = `tx-${schoolId}-${Date.now()}`;
        verified(ref);
        mockAuditFind.mockResolvedValue({ id: 'already' });
        await send(ref);
        expect(mockSchoolUpdate).not.toHaveBeenCalled();
    });

    test('an underpayment does not extend access', async () => {
        const ref = `tx-${schoolId}-${Date.now()}`;
        verified(ref, '10');
        await send(ref);
        expect(mockSchoolUpdate).not.toHaveBeenCalled();
    });

    test('a stale reference is ignored without calling Chapa', async () => {
        const ref = `tx-${schoolId}-${Date.now() - days(30)}`;
        verified(ref);
        await send(ref);
        expect(mockFetch).not.toHaveBeenCalled();
        expect(mockSchoolUpdate).not.toHaveBeenCalled();
    });

    test('a payment must cover the quote recorded at checkout, not the legacy amount', async () => {
        const ref = `tx-${schoolId}-${Date.now()}`;
        mockAuditFind.mockImplementation(async (args: any) =>
            args.where.action === 'CHAPA_CHECKOUT_QUOTED' ? { after: { amountEtb: 7910 } } : null);

        verified(ref, '5880');
        await send(ref);
        expect(mockSchoolUpdate).not.toHaveBeenCalled();

        verified(ref, '7910');
        await send(ref);
        expect(mockSchoolUpdate).toHaveBeenCalledTimes(1);
    });

    test('a bad signature is rejected', async () => {
        const res = await chapaWebhook(new Request('https://x.test', { method: 'POST', body: '{}', headers: { 'chapa-signature': 'deadbeef' } }));
        expect(res.status).toBe(400);
        expect(mockSchoolUpdate).not.toHaveBeenCalled();
    });
});
