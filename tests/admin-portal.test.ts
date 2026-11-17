import { AdminRole } from '@prisma/client';
import { ROLE_ROUTE_PERMISSIONS, getDefaultRouteForRole, isRoleAllowedForPath } from '../apps/admin/lib/rbac';
import {
    hashPassword,
    verifyPassword,
    signSessionCookie,
    verifySessionCookieFast,
    INACTIVITY_TIMEOUT_MS,
} from '../apps/admin/lib/auth';
import { getSchoolRoleRedirect } from '../lib/navigation';

describe('Admin Portal RBAC Matrix & Isolation Invariants', () => {
    test('superadmin can access all 5 administrative sections', () => {
        const sections = ['/finance', '/security', '/logs', '/support', '/superadmin'];
        for (const section of sections) {
            expect(isRoleAllowedForPath(AdminRole.SUPERADMIN, section)).toBe(true);
        }
    });

    test('finance admin can only access /finance and is blocked from other sections', () => {
        expect(isRoleAllowedForPath(AdminRole.FINANCE, '/finance')).toBe(true);
        expect(isRoleAllowedForPath(AdminRole.FINANCE, '/security')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.FINANCE, '/logs')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.FINANCE, '/support')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.FINANCE, '/superadmin')).toBe(false);
    });

    test('security admin can only access /security and is blocked from other sections', () => {
        expect(isRoleAllowedForPath(AdminRole.SECURITY, '/security')).toBe(true);
        expect(isRoleAllowedForPath(AdminRole.SECURITY, '/finance')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SECURITY, '/logs')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SECURITY, '/support')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SECURITY, '/superadmin')).toBe(false);
    });

    test('developer admin can only access /logs and is blocked from other sections', () => {
        expect(isRoleAllowedForPath(AdminRole.DEVELOPER, '/logs')).toBe(true);
        expect(isRoleAllowedForPath(AdminRole.DEVELOPER, '/finance')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.DEVELOPER, '/security')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.DEVELOPER, '/support')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.DEVELOPER, '/superadmin')).toBe(false);
    });

    test('support admin can only access /support and is blocked from other sections', () => {
        expect(isRoleAllowedForPath(AdminRole.SUPPORT, '/support')).toBe(true);
        expect(isRoleAllowedForPath(AdminRole.SUPPORT, '/finance')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SUPPORT, '/security')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SUPPORT, '/logs')).toBe(false);
        expect(isRoleAllowedForPath(AdminRole.SUPPORT, '/superadmin')).toBe(false);
    });

    test('default landing paths route each role directly to their authorized section', () => {
        expect(getDefaultRouteForRole(AdminRole.SUPERADMIN)).toBe('/superadmin');
        expect(getDefaultRouteForRole(AdminRole.FINANCE)).toBe('/finance');
        expect(getDefaultRouteForRole(AdminRole.SECURITY)).toBe('/security');
        expect(getDefaultRouteForRole(AdminRole.DEVELOPER)).toBe('/logs');
        expect(getDefaultRouteForRole(AdminRole.SUPPORT)).toBe('/support');
    });

    test('cross-role unauthorized access is strictly mapped in ROLE_ROUTE_PERMISSIONS', () => {
        expect(ROLE_ROUTE_PERMISSIONS['/finance']).toEqual([AdminRole.FINANCE, AdminRole.SUPERADMIN]);
        expect(ROLE_ROUTE_PERMISSIONS['/security']).toEqual([AdminRole.SECURITY, AdminRole.SUPERADMIN]);
        expect(ROLE_ROUTE_PERMISSIONS['/logs']).toEqual([AdminRole.DEVELOPER, AdminRole.SUPERADMIN]);
        expect(ROLE_ROUTE_PERMISSIONS['/support']).toEqual([AdminRole.SUPPORT, AdminRole.SUPERADMIN]);
        expect(ROLE_ROUTE_PERMISSIONS['/superadmin']).toEqual([AdminRole.SUPERADMIN]);
    });
});

describe('Admin Portal Authentication, HMAC Tokens & 30-Minute Inactivity Window', () => {
    test('passwords are hashed with bcrypt and verifiable', async () => {
        const rawPassword = 'ExtremelySecureAdminPassword_2026!';
        const hash = await hashPassword(rawPassword);
        expect(hash).not.toEqual(rawPassword);
        expect(hash.startsWith('$2')).toBe(true);

        const isValid = await verifyPassword(rawPassword, hash);
        expect(isValid).toBe(true);

        const isInvalid = await verifyPassword('WrongPassword', hash);
        expect(isInvalid).toBe(false);
    });

    test('session cookies use tamper-proof HMAC signatures', async () => {
        const payload = {
            sessionId: 'sess_123',
            adminId: 'adm_123',
            role: AdminRole.FINANCE,
            lastActiveAt: Date.now(),
        };

        const signed = await signSessionCookie(payload);
        expect(signed).toContain('.');

        const verified = await verifySessionCookieFast(signed);
        expect(verified).not.toBeNull();
        expect(verified?.sessionId).toBe('sess_123');
        expect(verified?.role).toBe(AdminRole.FINANCE);

        // Tampered token must fail verification
        const tampered = signed.slice(0, -4) + 'abcd';
        const tamperedVerified = await verifySessionCookieFast(tampered);
        expect(tamperedVerified).toBeNull();
    });

    test('sessions older than 30 minutes of inactivity are considered expired', async () => {
        expect(INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000);

        const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
        const expiredPayload = {
            sessionId: 'sess_old',
            adminId: 'adm_old',
            role: AdminRole.SUPERADMIN,
            lastActiveAt: thirtyOneMinutesAgo,
        };

        const expiredCookie = await signSessionCookie(expiredPayload);
        const verifiedExpired = await verifySessionCookieFast(expiredCookie);
        expect(verifiedExpired).toBeNull();

        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const activePayload = {
            sessionId: 'sess_active',
            adminId: 'adm_active',
            role: AdminRole.SUPERADMIN,
            lastActiveAt: tenMinutesAgo,
        };

        const activeCookie = await signSessionCookie(activePayload);
        const verifiedActive = await verifySessionCookieFast(activeCookie);
        expect(verifiedActive).not.toBeNull();
        expect(verifiedActive?.sessionId).toBe('sess_active');
    });
});

describe('School-Facing Routing & Total Domain Isolation', () => {
    test('school login redirects to role-specific dashboard path', () => {
        expect(getSchoolRoleRedirect('OWNER')).toBe('/dashboard');
        expect(getSchoolRoleRedirect('PRINCIPAL')).toBe('/dashboard');
        expect(getSchoolRoleRedirect('DIRECTOR')).toBe('/dashboard');
        expect(getSchoolRoleRedirect('TEACHER')).toBe('/dashboard/attendance');
        expect(getSchoolRoleRedirect('HOMEROOM')).toBe('/dashboard/attendance');
        expect(getSchoolRoleRedirect('PARENT')).toBe('/dashboard/parent');
        expect(getSchoolRoleRedirect('STUDENT')).toBe('/dashboard/student');
        expect(getSchoolRoleRedirect('ACCOUNTANT')).toBe('/dashboard/finance');
        expect(getSchoolRoleRedirect('RECORDER')).toBe('/dashboard/students');
    });

    test('default fallback role safely redirects to /dashboard', () => {
        expect(getSchoolRoleRedirect(undefined)).toBe('/dashboard');
        expect(getSchoolRoleRedirect('UNKNOWN_ROLE')).toBe('/dashboard');
    });
});
