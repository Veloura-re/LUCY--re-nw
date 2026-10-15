/**
 * Returns a same-origin relative path that is safe to redirect to, or `fallback`.
 *
 * Rejects absolute URLs, protocol-relative URLs (`//host`), backslash tricks (`/\host`),
 * userinfo tricks (`@host`) and control characters, so a `next` query parameter can never
 * send the user to another origin.
 */
export function safeNextPath(next: string | null | undefined, fallback: string = '/'): string {
    if (typeof next !== 'string' || next.length === 0 || next.length > 2048) return fallback;
    if (!next.startsWith('/') || next.startsWith('//')) return fallback;
    if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

    try {
        const base = 'http://redirect.invalid';
        const resolved = new URL(next, base);
        if (resolved.origin !== base) return fallback;
        return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
        return fallback;
    }
}
