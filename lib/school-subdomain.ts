/**
 * Parses a school tenant hostname under the Lucy wildcard domain.
 *
 * This utility deliberately does not make authorization decisions: authentication and
 * CSRF protections must continue to require the exact request origin.
 */
export const RESERVED_SCHOOL_SUBDOMAINS = new Set([
    'www',
    'api',
    'admin',
    '4xctrl',
    'app',
    'portal',
    'mail',
    'smtp',
    'dev',
    'test',
    'staging',
]);

const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

/**
 * Returns the single tenant label from `school.lucyos.5-cn.net`, otherwise null.
 * Multi-level names and reserved infrastructure names are never tenants.
 */
export function extractSchoolSubdomain(hostname: string | null | undefined): string | null {
    if (!hostname) return null;

    const host = hostname.split(':')[0].trim().toLowerCase();
    const suffix = '.lucyos.5-cn.net';

    if (!host.endsWith(suffix)) return null;

    const label = host.slice(0, -suffix.length);
    if (!label || label.includes('.') || RESERVED_SCHOOL_SUBDOMAINS.has(label) || !SUBDOMAIN_PATTERN.test(label)) {
        return null;
    }

    return label;
}
