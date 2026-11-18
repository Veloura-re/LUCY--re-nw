import { NextRequest } from 'next/server';
import { middleware } from '../middleware';
import { getSchoolRoleRedirect } from '../lib/navigation';

describe('Domain Canonicalization (5-cn.net -> lucyos.5-cn.net)', () => {
    test('redirects 5-cn.net to lucyos.5-cn.net with 308 status preserving path and params', async () => {
        const req = new NextRequest('http://5-cn.net/login?ref=portal', {
            headers: {
                host: '5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe('https://lucyos.5-cn.net/login?ref=portal');
    });

    test('redirects www.5-cn.net to lucyos.5-cn.net with 308 status', async () => {
        const req = new NextRequest('http://www.5-cn.net/register', {
            headers: {
                host: 'www.5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe('https://lucyos.5-cn.net/register');
    });

    test('redirects apex root / to https://lucyos.5-cn.net/', async () => {
        const req = new NextRequest('http://5-cn.net/', {
            headers: {
                host: '5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe('https://lucyos.5-cn.net/');
    });

    test('honors x-forwarded-host header from reverse proxies', async () => {
        const req = new NextRequest('https://internal-alb:8080/login', {
            headers: {
                'x-forwarded-host': '5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).toBe(308);
        expect(res.headers.get('location')).toBe('https://lucyos.5-cn.net/login');
    });

    test('does not redirect canonical host lucyos.5-cn.net', async () => {
        const req = new NextRequest('https://lucyos.5-cn.net/login', {
            headers: {
                host: 'lucyos.5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).not.toBe(308);
    });

    test('does not redirect staging domain st4g3.lc9s.5-cn.net', async () => {
        const req = new NextRequest('https://st4g3.lc9s.5-cn.net/login', {
            headers: {
                host: 'st4g3.lc9s.5-cn.net',
            },
        });

        const res = await middleware(req);
        expect(res.status).not.toBe(308);
    });
});

describe('Customized Role Destinations', () => {
    test('routes each school role to their designated section', () => {
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

    test('defaults unknown or undefined roles safely to /dashboard', () => {
        expect(getSchoolRoleRedirect(undefined)).toBe('/dashboard');
        expect(getSchoolRoleRedirect('')).toBe('/dashboard');
        expect(getSchoolRoleRedirect('GUEST')).toBe('/dashboard');
    });
});
