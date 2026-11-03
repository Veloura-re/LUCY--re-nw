/**
 * The device-session gate and the Google callback. A Supabase session that did not come through this
 * server's full sign-in must be refused, and Google must never create an account.
 */
const mockCookies = jest.fn();
const mockActive = jest.fn();
const mockGetUser = jest.fn();
const mockSignOut = jest.fn();
const mockExchange = jest.fn();
const mockDeleteUser = jest.fn();
const mockFindUser = jest.fn();
const mockIssue = jest.fn();
const mockSetCookies = jest.fn();

jest.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => mockCookies(n) }), headers: async () => new Headers() }));
jest.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: (...a: any[]) => mockFindUser(...a) } } }));
jest.mock('@/utils/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: (...a: any[]) => mockGetUser(...a), signOut: (...a: any[]) => mockSignOut(...a), exchangeCodeForSession: (...a: any[]) => mockExchange(...a) } }),
}));
jest.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ auth: { admin: { deleteUser: (...a: any[]) => mockDeleteUser(...a) } } }) }));
jest.mock('@/lib/users', () => ({ getCachedUser: jest.fn() }));
jest.mock('@/lib/auth-audit', () => ({ recordAuthAudit: jest.fn() }));
jest.mock('@/lib/audit', () => ({ logActivity: jest.fn() }));

import { getDeviceSessionState } from '@/lib/device-session';
import { requireAuth } from '@/lib/security';
import { deviceMark, isValidDeviceMark } from '@/lib/device-mark';

beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteUser.mockResolvedValue({});
    mockSignOut.mockResolvedValue({});
});

describe('device session gate', () => {
    test('no cookie, a stale cookie and a matching cookie', async () => {
        mockFindUser.mockResolvedValue({ activeSessionId: 'tok-1' });
        mockCookies.mockReturnValue(undefined);
        expect(await getDeviceSessionState('u1')).toBe('missing');
        mockCookies.mockReturnValue({ value: 'tok-0' });
        expect(await getDeviceSessionState('u1-b')).toBe('superseded');
        mockCookies.mockReturnValue({ value: 'tok-1' });
        expect(await getDeviceSessionState('u1-c')).toBe('valid');
    });

    test('requireAuth refuses a Supabase session with no device session', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
        mockFindUser.mockResolvedValue({ activeSessionId: 'tok-1' });
        mockCookies.mockReturnValue(undefined);
        await expect(requireAuth()).rejects.toThrow(/Unauthorized/);
        mockCookies.mockReturnValue({ value: 'tok-1' });
        await expect(requireAuth()).resolves.toMatchObject({ id: 'u9' });
    });
});

describe('device mark', () => {
    test('binds the cookie to the user and rejects tampering', async () => {
        const mark = await deviceMark('u1', 'tok');
        expect(await isValidDeviceMark('u1', 'tok', mark)).toBe(true);
        expect(await isValidDeviceMark('u2', 'tok', mark)).toBe(false);
        expect(await isValidDeviceMark('u1', 'tok2', mark)).toBe(false);
        expect(await isValidDeviceMark('u1', 'tok', mark.slice(0, -1) + (mark.endsWith('0') ? '1' : '0'))).toBe(false);
        expect(await isValidDeviceMark('u1', undefined, mark)).toBe(false);
    });
});

describe('Google callback', () => {
    const oauthToken = () => {
        const payload = Buffer.from(JSON.stringify({ amr: [{ method: 'oauth' }] })).toString('base64url');
        return `h.${payload}.s`;
    };
    const session = (over: Record<string, any> = {}) => ({
        access_token: oauthToken(),
        user: {
            id: 'g1', email: 'teacher@school.edu', email_confirmed_at: '2026-11-01',
            identities: [{ provider: 'google', identity_data: { email_verified: true } }],
            ...over,
        },
    });
    const call = async () => {
        jest.resetModules();
        jest.doMock('@/lib/device-session', () => ({ issueDeviceSession: (...a: any[]) => mockIssue(...a), setDeviceCookies: (...a: any[]) => mockSetCookies(...a) }));
        const { GET } = await import('@/app/auth/callback/route');
        return GET(new Request('https://app.test/auth/callback?code=abc&next=/dashboard'));
    };

    test('an existing account signs in without a code and gets a device session', async () => {
        mockExchange.mockResolvedValue({ data: { session: session() }, error: null });
        mockFindUser.mockResolvedValue({ id: 'g1', schoolId: 'school-a' });
        mockIssue.mockResolvedValue('tok');
        const res = await call();
        expect(res.headers.get('location')).toBe('https://app.test/dashboard');
        expect(mockIssue).toHaveBeenCalledWith('g1');
        expect(mockSetCookies).toHaveBeenCalled();
        expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    test('an unknown Google account is deleted and rejected', async () => {
        mockExchange.mockResolvedValue({ data: { session: session() }, error: null });
        mockFindUser.mockResolvedValue(null);
        const res = await call();
        expect(res.headers.get('location')).toContain('/login?error=');
        expect(mockDeleteUser).toHaveBeenCalledWith('g1');
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockIssue).not.toHaveBeenCalled();
    });

    test('an unverified Google email is rejected even when the account exists', async () => {
        mockExchange.mockResolvedValue({ data: { session: session({ identities: [{ provider: 'google', identity_data: { email_verified: false } }] }) }, error: null });
        mockFindUser.mockResolvedValue({ id: 'g1', schoolId: 'school-a' });
        const res = await call();
        expect(res.headers.get('location')).toContain('/login?error=');
        expect(mockIssue).not.toHaveBeenCalled();
    });

    test('a non-OAuth session never receives a device session, whatever the query says', async () => {
        const payload = Buffer.from(JSON.stringify({ amr: [{ method: 'otp' }] })).toString('base64url');
        mockExchange.mockResolvedValue({ data: { session: { ...session(), access_token: `h.${payload}.s` } }, error: null });
        const res = await call();
        expect(res.headers.get('location')).toBe('https://app.test/dashboard');
        expect(mockIssue).not.toHaveBeenCalled();
    });
});

describe('one-time upgrade of legacy device cookies', () => {
    const upgrade = async (state: { cookie?: string; active?: string; user?: boolean }) => {
        jest.resetModules();
        jest.dontMock('@/lib/device-session');
        mockGetUser.mockResolvedValue({ data: { user: state.user === false ? null : { id: 'u1' } } });
        mockCookies.mockImplementation((n: string) => (n === 'lucy_device_session' && state.cookie ? { value: state.cookie } : undefined));
        mockFindUser.mockResolvedValue({ activeSessionId: state.active ?? null });
        const { GET } = await import('@/app/auth/upgrade/route');
        return GET(new Request('https://app.test/auth/upgrade?next=/dashboard/students'));
    };

    afterEach(() => jest.useRealTimers());

    test('a cookie that matches the stored token gets its signature', async () => {
        const res = await upgrade({ cookie: 'tok', active: 'tok' });
        expect(res.headers.get('location')).toBe('https://app.test/dashboard/students');
        expect(res.headers.get('set-cookie')).toContain('lucy_device_mark=');
    });

    test('a cookie that does not match, a missing cookie and no session are refused', async () => {
        for (const state of [{ cookie: 'forged', active: 'tok' }, { active: 'tok' }, { cookie: 'tok', active: 'tok', user: false }]) {
            const res = await upgrade(state);
            expect(res.headers.get('location')).toContain('/logout?reason=session');
            expect(res.headers.get('set-cookie')).toBeNull();
        }
    });

    test('is closed after the cut-off date', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00Z'));
        const res = await upgrade({ cookie: 'tok', active: 'tok' });
        expect(res.headers.get('location')).toContain('/logout?reason=session');
    });
});
