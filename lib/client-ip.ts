/**
 * Client IP used as the rate-limit key. Only the header the hosting platform overwrites is
 * trusted (Vercel sets x-real-ip, Cloudflare sets cf-connecting-ip); a header the client can
 * set itself would let a caller pick its own bucket, or claim to be localhost, and skip limits.
 */
export function getClientIp(request: { headers: Headers }): string {
    const raw = process.env.VERCEL
        ? request.headers.get('x-real-ip')
        : request.headers.get('cf-connecting-ip');
    return (raw || 'unknown').replace(/^\[?([^\]]+)\]?:[0-9]+$/, '$1').trim();
}

/** Loopback is only exempt from limits outside production, so a spoofed address cannot use it. */
export function isExemptFromRateLimit(ip: string): boolean {
    return process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost');
}

/** The client IP when it is a well-formed address, otherwise 0.0.0.0 so an unreadable header can never read as localhost. */
export function getValidatedClientIp(request: { headers: Headers }): string {
    const candidate = getClientIp(request);
    const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6 = /^[0-9a-fA-F:]{2,39}$/;
    return ipv4.test(candidate) || ipv6.test(candidate) ? candidate : '0.0.0.0';
}
