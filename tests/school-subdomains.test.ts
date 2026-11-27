import { extractSchoolSubdomain, RESERVED_SCHOOL_SUBDOMAINS } from '../lib/school-subdomain';

describe('school tenant hostname parsing', () => {
    test('accepts one valid label under the Lucy wildcard domain', () => {
        expect(extractSchoolSubdomain('apex.lucyos.5-cn.net')).toBe('apex');
        expect(extractSchoolSubdomain('st-marys.lucyos.5-cn.net:443')).toBe('st-marys');
        expect(extractSchoolSubdomain('ACADEMY-101.LUCYOS.5-CN.NET')).toBe('academy-101');
    });

    test('does not classify platform, admin, or malformed hostnames as tenants', () => {
        expect(extractSchoolSubdomain('lucyos.5-cn.net')).toBeNull();
        expect(extractSchoolSubdomain('4xctrl.lc9s.5-cn.net')).toBeNull();
        expect(extractSchoolSubdomain('api.lucyos.5-cn.net')).toBeNull();
        expect(extractSchoolSubdomain('north.apex.lucyos.5-cn.net')).toBeNull();
        expect(extractSchoolSubdomain('invalid_name.lucyos.5-cn.net')).toBeNull();
        expect(extractSchoolSubdomain('apex.lucyos.5-cn.net.attacker.example')).toBeNull();
    });

    test('keeps every reserved infrastructure name out of the tenant namespace', () => {
        for (const reserved of RESERVED_SCHOOL_SUBDOMAINS) {
            expect(extractSchoolSubdomain(`${reserved}.lucyos.5-cn.net`)).toBeNull();
        }
    });
});
