/**
 * POST /api/auth/login: the password step must not open a session by itself when a code is required.
 */
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockIsTrusted = jest.fn();
const mockCreateChallenge = jest.fn();
const mockSendCode = jest.fn();
const mockIssue = jest.fn();
const mockSetCookies = jest.fn();
const mockCookieGet = jest.fn();

jest.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => mockCookieGet(n) }) }));
jest.mock('@/utils/supabase/server', () => ({
    createClient: async () => ({ auth: { signInWithPassword: (...a: any[]) => mockSignIn(...a), signOut: (...a: any[]) => mockSignOut(...a) } }),
}));
jest.mock('@/lib/prisma', () => ({ prisma: { $executeRaw: async () => 1, $queryRaw: async () => [{ allowed: true }] } }));
jest.mock('@/lib/consent', () => ({ recordConsent: async () => ({ recorded: true }) }));
jest.mock('@/lib/auth-audit', () => ({ recordAuthAudit: async () => undefined }));
jest.mock('@/lib/email', () => ({ sendLoginCodeEmail: (...a: any[]) => mockSendCode(...a) }));
jest.mock('@/lib/device-session', () => ({ issueDeviceSession: (...a: any[]) => mockIssue(...a), setDeviceCookies: (...a: any[]) => mockSetCookies(...a) }));
jest.mock('@/lib/login-otp', () => ({
    isOtpRequiredFor: (email: string) => !email.endsWith('@lucy.local'),
    isTrustedDevice: (...a: any[]) => mockIsTrusted(...a),
    createChallenge: (...a: any[]) => mockCreateChallenge(...a),
    trustedCookieOptions: () => ({}),
    TRUSTED_COOKIE: 'lucy_trusted_device',
}));

import { POST } from '@/app/api/auth/login/route';

const login = () =>
    POST(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.edu', password: 'pw', turnstileToken: 't', acceptedTerms: true }),
    }));

beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn(async () => ({ json: async () => ({ success: true }) }));
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.edu' } }, error: null });
    mockCreateChallenge.mockResolvedValue({ code: '123456' });
    mockSendCode.mockResolvedValue({ success: true });
    mockIssue.mockResolvedValue('tok');
    mockCookieGet.mockReturnValue(undefined);
    mockIsTrusted.mockResolvedValue(false);
});

test('an untrusted device gets a code and no device session', async () => {
    const res = await login();
    const body = await res.json();
    expect(body).toEqual({ success: true, otpRequired: true });
    expect(mockSendCode).toHaveBeenCalledWith('a@b.edu', '123456');
    expect(mockIssue).not.toHaveBeenCalled();
    expect(mockSetCookies).not.toHaveBeenCalled();
});

test('a trusted device skips the code and gets the device session', async () => {
    mockCookieGet.mockReturnValue({ value: 'a'.repeat(64) });
    mockIsTrusted.mockResolvedValue(true);
    const body = await (await login()).json();
    expect(body).toMatchObject({ success: true, userId: 'u1' });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
    expect(mockIssue).toHaveBeenCalledWith('u1');
    expect(mockSetCookies).toHaveBeenCalled();
});

test('an address that cannot receive mail signs in with the password alone', async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u2', email: 'st-1@lucy.local' } }, error: null });
    const body = await (await login()).json();
    expect(body).toMatchObject({ success: true, userId: 'u2' });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
});

test('if the code email cannot be sent the session is closed and nothing is issued', async () => {
    mockSendCode.mockResolvedValue({ success: false });
    const res = await login();
    expect(res.status).toBe(503);
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIssue).not.toHaveBeenCalled();
});
