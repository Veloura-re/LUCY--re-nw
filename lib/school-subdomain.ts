/**
 * School Tenant Subdomain Resolution (Beta).
 * Extracts and validates tenant subdomains under *.lucyos.5-cn.net.
 */

export const RESERVED_SUBDOMAINS = new Set([
    'www',
    'api',
    'st4g3',
    '4xctrl',
    'admin',
    'mail',
    'smtp',
    'app',
    'portal',
    'dev',
    'test',
    'staging',
]);

/**
 * Extracts the tenant school subdomain from an incoming hostname.
 * Examples:
 * - 'apex.lucyos.5-cn.net' -> 'apex'
 * - 'academy-1.lucyos.5-cn.net' -> 'academy-1'
 * - 'lucyos.5-cn.net' -> null
 * - '4xctrl.lc9s.5-cn.net' -> null
 * - 'www.lucyos.5-cn.net' -> null (reserved)
 */
export function extractSchoolSubdomain(hostname: string | null | undefined): string | null {
    if (!hostname) return null;

    const host = hostname.split(':')[0].trim().toLowerCase();

    // In development or local testing, support *.localhost
    if (process.env.NODE_ENV !== 'production' && host.endsWith('.localhost')) {
        const prefix = host.slice(0, -'.localhost'.length);
        if (!prefix || prefix.includes('.') || RESERVED_SUBDOMAINS.has(prefix) || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(prefix)) {
            return null;
        }
        return prefix;
    }

    // Only process subdomains under lucyos.5-cn.net
    if (!host.endsWith('.lucyos.5-cn.net')) {
        return null;
    }

    const prefix = host.slice(0, -'.lucyos.5-cn.net'.length);

    // Prevent multi-level subdomains or empty prefixes
    if (!prefix || prefix.includes('.')) {
        return null;
    }

    // Ignore reserved technical subdomains
    if (RESERVED_SUBDOMAINS.has(prefix)) {
        return null;
    }

    // Validate alphanumeric and hyphen format
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(prefix)) {
        return null;
    }

    return prefix;
}

/**
 * Checks whether an origin or hostname belongs to the trusted *.lucyos.5-cn.net domain family.
 */
export function isTrustedSchoolOrigin(originOrHost: string | null | undefined): boolean {
    if (!originOrHost) return false;
    let host = originOrHost.trim().toLowerCase();
    try {
        if (host.includes('://')) {
            host = new URL(host).hostname.toLowerCase();
        }
    } catch {
        return false;
    }

    host = host.split(':')[0];

    if (host === 'lucyos.5-cn.net' || host === '5-cn.net' || host === 'www.5-cn.net') {
        return true;
    }

    if (host.endsWith('.lucyos.5-cn.net')) {
        const sub = extractSchoolSubdomain(host);
        return sub !== null;
    }

    if (process.env.NODE_ENV !== 'production' && (host === 'localhost' || host.endsWith('.localhost'))) {
        return true;
    }

    return false;
}

/**
 * Builds the canonical public URL for a school subdomain.
 */
export function buildSchoolSubdomainUrl(subdomain: string, path: string = '/'): string {
    const cleanSubdomain = subdomain.trim().toLowerCase();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `https://${cleanSubdomain}.lucyos.5-cn.net${cleanPath}`;
}
