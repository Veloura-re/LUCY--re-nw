const mockLogError = jest.fn();
const mockSend = jest.fn();
const mockHeaders = jest.fn();

jest.mock('@/lib/audit', () => ({ logError: (...a: any[]) => mockLogError(...a), logActivity: jest.fn(), getIp: () => undefined }));
jest.mock('@/lib/email', () => ({ sendEmail: (...a: any[]) => mockSend(...a) }));
jest.mock('next/headers', () => ({ headers: async () => mockHeaders() }));
jest.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: jest.fn().mockResolvedValue(null) } } }));
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));

import { reportServerError, redactSecrets, resetErrorCaptureState } from '@/lib/error-capture';

beforeEach(() => {
    jest.clearAllMocks();
    resetErrorCaptureState();
    delete process.env.ALERT_EMAIL;
    mockHeaders.mockReturnValue(new Headers({ 'x-pathname': '/api/school/finance/invoices', 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'jest' }));
});

describe('redactSecrets', () => {
    test('removes connection strings, tokens and keys', () => {
        const dirty = [
            'connect failed postgresql://user:hunter2@db.example.com:5432/app',
            'Authorization: Bearer abcdefghijklmnop12345',
            'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
            'key sk_live_abcdefghij1234 and re_abcdefghijklmnopqrstu and AIzaSyAbcdefghijklmnopqrstuvwx',
            'password=SuperSecret99',
        ].join(' | ');
        const clean = redactSecrets(dirty);
        for (const leaked of ['hunter2', 'abcdefghijklmnop12345', 'dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk', 'sk_live_abcdefghij1234', 'AIzaSyAbcdefghij', 'SuperSecret99']) {
            expect(clean).not.toContain(leaked);
        }
    });

    test('leaves ordinary messages alone', () => {
        expect(redactSecrets('Marklist is locked for this term')).toBe('Marklist is locked for this term');
    });
});

describe('reportServerError', () => {
    test('records the failure with request context and redacted text', async () => {
        await reportServerError(new Error('boom postgresql://u:p@h/db'), { status: 500 });
        expect(mockLogError).toHaveBeenCalledTimes(1);
        const arg = mockLogError.mock.calls[0][0];
        expect(arg).toMatchObject({ type: 'api_error', level: 'ERROR', statusCode: 500, path: '/api/school/finance/invoices', ip: '203.0.113.9' });
        expect(arg.message).not.toContain('u:p@h');
    });

    test('collapses an identical repeat within the window', async () => {
        await reportServerError(new Error('same failure'));
        await reportServerError(new Error('same failure'));
        expect(mockLogError).toHaveBeenCalledTimes(1);
        await reportServerError(new Error('a different failure'));
        expect(mockLogError).toHaveBeenCalledTimes(2);
    });

    test('caps a burst so an outage cannot flood the table', async () => {
        for (let i = 0; i < 100; i++) await reportServerError(new Error(`distinct failure ${i}`));
        expect(mockLogError.mock.calls.length).toBeLessThanOrEqual(40);
    });

    test('never throws, even when the log write fails', async () => {
        mockLogError.mockRejectedValueOnce(new Error('db down'));
        await expect(reportServerError(new Error('x'))).resolves.toBeUndefined();
    });

    test('works outside a request', async () => {
        mockHeaders.mockImplementation(() => { throw new Error('no request scope'); });
        await reportServerError(new Error('from a cron job'), { type: 'cron_failure' });
        expect(mockLogError).toHaveBeenCalledWith(expect.objectContaining({ type: 'cron_failure', path: undefined }));
    });

    test('emails an alert for payment and webhook failures only, and only once per window', async () => {
        process.env.ALERT_EMAIL = 'ops@example.com';
        await reportServerError(new Error('ordinary'), { type: 'api_error' });
        expect(mockSend).not.toHaveBeenCalled();

        await reportServerError(new Error('chapa webhook broke'), { type: 'webhook_failure' });
        await reportServerError(new Error('chapa webhook broke again, different text'), { type: 'webhook_failure' });
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend.mock.calls[0][0].to).toBe('ops@example.com');
    });

    test('does not alert when no address is configured', async () => {
        await reportServerError(new Error('chapa webhook broke'), { type: 'webhook_failure' });
        expect(mockSend).not.toHaveBeenCalled();
    });
});
