/**
 * First-touch marketing attribution carried in a first-party cookie. The browser records where a
 * visitor came from (for example a TikTok video link); the server reads it when they submit a
 * request, so no tracking script or third-party cookie is involved.
 */

export const ATTRIBUTION_COOKIE = 'lucy_attr';
export const ATTRIBUTION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type Attribution = {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    ttclid?: string;
    plan?: string;
};

const FIELDS: Array<[keyof Attribution, string]> = [
    ['source', 'utm_source'],
    ['medium', 'utm_medium'],
    ['campaign', 'utm_campaign'],
    ['content', 'utm_content'],
    ['term', 'utm_term'],
    ['ttclid', 'ttclid'],
    ['plan', 'plan'],
];

/** Keeps values short and free of anything that could be misread as markup or another field. */
function clean(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const v = value.trim().replace(/[^A-Za-z0-9_.\-]/g, '').slice(0, 64);
    return v || undefined;
}

/** Reads attribution fields from URL query parameters. Returns null when none are present. */
export function attributionFromParams(params: URLSearchParams): Attribution | null {
    const out: Attribution = {};
    for (const [key, param] of FIELDS) {
        const v = clean(params.get(param));
        if (v) out[key] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
}

/** Parses the attribution cookie out of a raw Cookie header. Always returns a sanitised object. */
export function attributionFromCookieHeader(cookieHeader: string | null | undefined): Attribution {
    if (!cookieHeader) return {};
    const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
    if (!match) return {};
    try {
        const raw = JSON.parse(decodeURIComponent(match.slice(ATTRIBUTION_COOKIE.length + 1)));
        const out: Attribution = {};
        for (const [key] of FIELDS) {
            const v = clean(raw?.[key]);
            if (v) out[key] = v;
        }
        return out;
    } catch {
        return {};
    }
}

/** One readable line for storing with a request, or an empty string when there is nothing to record. */
export function formatAttribution(a: Attribution): string {
    const parts = FIELDS.map(([key]) => (a[key] ? `${key}=${a[key]}` : null)).filter(Boolean);
    return parts.length ? `[attribution] ${parts.join(' ')}` : '';
}
