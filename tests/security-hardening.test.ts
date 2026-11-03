const mockFindUser = jest.fn();
const mockFindStudent = jest.fn();
const mockFindClass = jest.fn();
const mockGetCachedUser = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...a: any[]) => mockFindUser(...a) },
        student: { findUnique: (...a: any[]) => mockFindStudent(...a) },
        class: { findUnique: (...a: any[]) => mockFindClass(...a) },
    },
}));
jest.mock('@/utils/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: (...a: any[]) => mockGetUser(...a) } }),
}));
jest.mock('@/lib/users', () => ({ getCachedUser: (...a: any[]) => mockGetCachedUser(...a) }));
jest.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));
jest.mock('@/lib/device-session', () => ({ hasValidDeviceSession: async () => true }));

import {
    escapeHtml,
    isValidEmail,
    publicErrorMessage,
    requireSchoolLinked,
    requireStudentAccess,
    safeEqual,
    singleLine,
} from '@/lib/security';

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedUser.mockResolvedValue(null);
});

describe('string helpers', () => {
    test('safeEqual compares full values', () => {
        expect(safeEqual('Bearer abc', 'Bearer abc')).toBe(true);
        expect(safeEqual('Bearer abc', 'Bearer abd')).toBe(false);
        expect(safeEqual('Bearer abc', 'Bearer abcd')).toBe(false);
        expect(safeEqual('', 'x')).toBe(false);
    });

    test('escapeHtml neutralizes markup', () => {
        expect(escapeHtml('<img src=x onerror="a()">&\'')).toBe('&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
    });

    test('singleLine strips line breaks that enable header injection', () => {
        expect(singleLine('Subject\r\nBcc: victim@example.com')).not.toMatch(/[\r\n]/);
    });

    test('isValidEmail rejects markup and header injection', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('a@b.co\nBcc: x@y.z')).toBe(false);
        expect(isValidEmail('<a@b.co>')).toBe(false);
        expect(isValidEmail(42)).toBe(false);
    });
});

describe('publicErrorMessage', () => {
    test('passes application errors through', () => {
        expect(publicErrorMessage(new Error('Marklist is locked'), 'fallback')).toBe('Marklist is locked');
    });

    test('hides database and driver errors', () => {
        expect(publicErrorMessage(new Error('Invalid `prisma.user.findMany()` invocation'), 'fallback')).toBe('fallback');
        expect(publicErrorMessage(new Error('connect ECONNREFUSED 10.0.0.1:5432'), 'fallback')).toBe('fallback');
        expect(publicErrorMessage(Object.assign(new Error('duplicate key'), { code: '23505' }), 'fallback')).toBe('fallback');
        expect(publicErrorMessage({ message: 'raw object' }, 'fallback')).toBe('fallback');
    });
});

describe('requireSchoolLinked', () => {
    test('does not trust user_metadata when no database user exists', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'u1', email: 'a@b.co', user_metadata: { role: 'OWNER', schoolId: 'victim-school' } } },
            error: null,
        });
        mockFindUser.mockResolvedValue(null);

        await expect(requireSchoolLinked()).rejects.toThrow(/^Unauthorized/);
    });
});

describe('requireStudentAccess', () => {
    const authenticate = (dbUser: any) => {
        mockGetUser.mockResolvedValue({ data: { user: { id: dbUser.id, email: 'x@y.z', user_metadata: {} } }, error: null });
        mockFindUser.mockResolvedValue(dbUser);
    };

    test('rejects an owner from another school', async () => {
        authenticate({ id: 'o1', role: 'OWNER', schoolId: 'school-a', name: 'O', email: 'o@x.z', preferences: null });
        mockFindStudent.mockResolvedValue({ id: 's1', schoolId: 'school-b', classId: null });

        await expect(requireStudentAccess('s1')).rejects.toThrow(/^Forbidden/);
    });

    test('allows an owner of the same school', async () => {
        authenticate({ id: 'o1', role: 'OWNER', schoolId: 'school-a', name: 'O', email: 'o@x.z', preferences: null });
        mockFindStudent.mockResolvedValue({ id: 's1', schoolId: 'school-a', classId: null });

        await expect(requireStudentAccess('s1')).resolves.toMatchObject({ student: { id: 's1' } });
    });

    test('rejects a teacher who is not the homeroom teacher', async () => {
        authenticate({ id: 't1', role: 'TEACHER', schoolId: 'school-a', name: 'T', email: 't@x.z', preferences: null });
        mockFindStudent.mockResolvedValue({ id: 's1', schoolId: 'school-a', classId: 'c1' });
        mockFindClass.mockResolvedValue({ homeroomTeacherId: 'someone-else' });

        await expect(requireStudentAccess('s1')).rejects.toThrow(/^Forbidden/);
    });

    test('treats an unknown student the same as a cross-tenant one', async () => {
        authenticate({ id: 'o1', role: 'OWNER', schoolId: 'school-a', name: 'O', email: 'o@x.z', preferences: null });
        mockFindStudent.mockResolvedValue(null);

        await expect(requireStudentAccess('missing')).rejects.toThrow(/^Forbidden/);
    });
});

describe('secureRandomInt', () => {
    test('stays within bounds and varies', () => {
        const { secureRandomInt } = require('@/lib/security');
        const seen = new Set<number>();
        for (let i = 0; i < 400; i++) {
            const n = secureRandomInt(100, 999);
            expect(n).toBeGreaterThanOrEqual(100);
            expect(n).toBeLessThanOrEqual(999);
            seen.add(n);
        }
        expect(seen.size).toBeGreaterThan(100);
    });
});
