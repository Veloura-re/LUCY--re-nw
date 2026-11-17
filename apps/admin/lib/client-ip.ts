/**
 * Client IP resolution for audit logging and rate limiting.
 * Only the header overwritten by the hosting platform is trusted.
 */
export function getClientIp(request: { headers: Headers }): string {
    const raw = process.env.VERCEL
        ? request.headers.get('x-real-ip')
        : request.headers.get('cf-connecting-ip');
    return (raw || 'unknown').replace(/^\[?([^\]]+)\]?:[0-9]+$/, '$1').trim();
}

export function getValidatedClientIp(request: { headers: Headers }): string {
    const candidate = getClientIp(request);
    const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6 = /^[0-9a-fA-F:]{2,39}$/;
    return ipv4.test(candidate) || ipv6.test(candidate) ? candidate : '0.0.0.0';
}
