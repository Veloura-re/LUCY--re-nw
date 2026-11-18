import { 
    extractSchoolSubdomain, 
    isTrustedSchoolOrigin, 
    buildSchoolSubdomainUrl,
    RESERVED_SUBDOMAINS 
} from '../lib/school-subdomain';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

describe('School Tenant Subdomain Resolution (Beta)', () => {
    describe('extractSchoolSubdomain', () => {
        it('extracts valid tenant subdomains under *.lucyos.5-cn.net', () => {
            expect(extractSchoolSubdomain('apex.lucyos.5-cn.net')).toBe('apex');
            expect(extractSchoolSubdomain('oxford.lucyos.5-cn.net')).toBe('oxford');
            expect(extractSchoolSubdomain('st-marys.lucyos.5-cn.net')).toBe('st-marys');
            expect(extractSchoolSubdomain('academy-101.lucyos.5-cn.net')).toBe('academy-101');
        });

        it('handles case-insensitivity correctly', () => {
            expect(extractSchoolSubdomain('APEX.LUCYOS.5-CN.NET')).toBe('apex');
            expect(extractSchoolSubdomain('St-Marys.LucyOS.5-cn.net')).toBe('st-marys');
        });

        it('strips port numbers from hostnames', () => {
            expect(extractSchoolSubdomain('apex.lucyos.5-cn.net:3000')).toBe('apex');
            expect(extractSchoolSubdomain('oxford.lucyos.5-cn.net:443')).toBe('oxford');
        });

        it('returns null for apex platform domain without tenant prefix', () => {
            expect(extractSchoolSubdomain('lucyos.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('www.5-cn.net')).toBeNull();
        });

        it('rejects all reserved technical and administrative subdomains', () => {
            for (const reserved of RESERVED_SUBDOMAINS) {
                expect(extractSchoolSubdomain(`${reserved}.lucyos.5-cn.net`)).toBeNull();
            }
        });

        it('rejects multi-level subdomains to prevent spoofing or route ambiguity', () => {
            expect(extractSchoolSubdomain('sub.apex.lucyos.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('a.b.lucyos.5-cn.net')).toBeNull();
        });

        it('rejects foreign domains and isolated admin portal domains', () => {
            expect(extractSchoolSubdomain('4xctrl.lc9s.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('st4g3.lc9s.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('evil-phishing.com')).toBeNull();
            expect(extractSchoolSubdomain('lucyos.5-cn.net.attacker.com')).toBeNull();
        });

        it('rejects invalid subdomain formatting', () => {
            expect(extractSchoolSubdomain('-leading-hyphen.lucyos.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('invalid_underscore.lucyos.5-cn.net')).toBeNull();
            expect(extractSchoolSubdomain('spaces in name.lucyos.5-cn.net')).toBeNull();
        });

        it('handles null, undefined, and empty string safely', () => {
            expect(extractSchoolSubdomain(null)).toBeNull();
            expect(extractSchoolSubdomain(undefined)).toBeNull();
            expect(extractSchoolSubdomain('')).toBeNull();
            expect(extractSchoolSubdomain('   ')).toBeNull();
        });
    });

    describe('isTrustedSchoolOrigin', () => {
        it('trusts the primary platform domains', () => {
            expect(isTrustedSchoolOrigin('https://lucyos.5-cn.net')).toBe(true);
            expect(isTrustedSchoolOrigin('https://5-cn.net')).toBe(true);
            expect(isTrustedSchoolOrigin('https://www.5-cn.net')).toBe(true);
            expect(isTrustedSchoolOrigin('lucyos.5-cn.net')).toBe(true);
        });

        it('trusts valid tenant subdomains under lucyos.5-cn.net', () => {
            expect(isTrustedSchoolOrigin('https://apex.lucyos.5-cn.net')).toBe(true);
            expect(isTrustedSchoolOrigin('https://oxford.lucyos.5-cn.net')).toBe(true);
            expect(isTrustedSchoolOrigin('academy-1.lucyos.5-cn.net')).toBe(true);
        });

        it('rejects untrusted third-party domains', () => {
            expect(isTrustedSchoolOrigin('https://attacker.com')).toBe(false);
            expect(isTrustedSchoolOrigin('https://phishing-lucyos.com')).toBe(false);
            expect(isTrustedSchoolOrigin('https://apex.lucyos.5-cn.net.attacker.com')).toBe(false);
        });

        it('rejects reserved subdomains as tenant origins', () => {
            expect(isTrustedSchoolOrigin('https://4xctrl.lucyos.5-cn.net')).toBe(false);
            expect(isTrustedSchoolOrigin('https://admin.lucyos.5-cn.net')).toBe(false);
            expect(isTrustedSchoolOrigin('https://st4g3.lucyos.5-cn.net')).toBe(false);
        });

        it('handles invalid URL inputs safely', () => {
            expect(isTrustedSchoolOrigin('http://[invalid-url')).toBe(false);
            expect(isTrustedSchoolOrigin(null)).toBe(false);
            expect(isTrustedSchoolOrigin(undefined)).toBe(false);
            expect(isTrustedSchoolOrigin('')).toBe(false);
        });
    });

    describe('buildSchoolSubdomainUrl', () => {
        it('constructs canonical school subdomain URLs', () => {
            expect(buildSchoolSubdomainUrl('apex')).toBe('https://apex.lucyos.5-cn.net/');
            expect(buildSchoolSubdomainUrl('apex', '/login')).toBe('https://apex.lucyos.5-cn.net/login');
            expect(buildSchoolSubdomainUrl('OXFORD', 'dashboard')).toBe('https://oxford.lucyos.5-cn.net/dashboard');
        });
    });

    describe('Middleware Integration with Subdomains', () => {
        it('injects x-school-subdomain header for valid tenant host', async () => {
            const req = new NextRequest('https://apex.lucyos.5-cn.net/login', {
                headers: {
                    host: 'apex.lucyos.5-cn.net',
                },
            });

            const res = await middleware(req);
            expect(res.headers.get('x-school-subdomain')).toBe('apex');
        });

        it('does not inject x-school-subdomain for the root domain', async () => {
            const req = new NextRequest('https://lucyos.5-cn.net/login', {
                headers: {
                    host: 'lucyos.5-cn.net',
                },
            });

            const res = await middleware(req);
            expect(res.headers.get('x-school-subdomain')).toBeNull();
        });

        it('redirects 5-cn.net to https://lucyos.5-cn.net with 308 permanent redirect', async () => {
            const req = new NextRequest('https://5-cn.net/login', {
                headers: {
                    host: '5-cn.net',
                },
            });

            const res = await middleware(req);
            expect(res.status).toBe(308);
            expect(res.headers.get('location')).toBe('https://lucyos.5-cn.net/login');
        });

        it('seals admin paths with 404 regardless of host', async () => {
            const req = new NextRequest('https://apex.lucyos.5-cn.net/admin/users', {
                headers: {
                    host: 'apex.lucyos.5-cn.net',
                },
            });

            const res = await middleware(req);
            expect(res.status).toBe(404);
        });
    });
});
