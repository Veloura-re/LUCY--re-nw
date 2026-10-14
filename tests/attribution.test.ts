import { attributionFromParams, attributionFromCookieHeader, formatAttribution, ATTRIBUTION_COOKIE } from '@/lib/attribution';

const cookie = (value: unknown) => `a=1; ${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; b=2`;

test('reads campaign parameters from a URL and ignores everything else', () => {
    const a = attributionFromParams(new URLSearchParams('utm_source=tiktok&utm_medium=organic&utm_campaign=exam_week_solved&utm_content=script1&ttclid=abc123&plan=pilot&x=1'));
    expect(a).toEqual({ source: 'tiktok', medium: 'organic', campaign: 'exam_week_solved', content: 'script1', ttclid: 'abc123', plan: 'pilot' });
});

test('returns null when a URL carries no campaign parameters', () => {
    expect(attributionFromParams(new URLSearchParams('page=2&q=school'))).toBeNull();
});

test('strips markup and separators so values cannot inject text', () => {
    const a = attributionFromParams(new URLSearchParams({ utm_source: '<script>alert(1)</script>', utm_campaign: 'a b\nc=d' }));
    expect(a?.source).toBe('scriptalert1script');
    expect(a?.campaign).toBe('abcd');
});

test('truncates long values', () => {
    expect(attributionFromParams(new URLSearchParams({ utm_source: 'x'.repeat(500) }))?.source).toHaveLength(64);
});

test('parses the cookie from a header and sanitises what it finds', () => {
    expect(attributionFromCookieHeader(cookie({ source: 'tiktok', plan: 'core', evil: 'ignored', content: '<b>x</b>' })))
        .toEqual({ source: 'tiktok', plan: 'core', content: 'bxb' });
});

test('returns an empty object for a missing or corrupt cookie', () => {
    expect(attributionFromCookieHeader(null)).toEqual({});
    expect(attributionFromCookieHeader(`${ATTRIBUTION_COOKIE}=%7Bnot-json`)).toEqual({});
});

test('formats a single readable line, or nothing', () => {
    expect(formatAttribution({ source: 'tiktok', content: 'script1' })).toBe('[attribution] source=tiktok content=script1');
    expect(formatAttribution({})).toBe('');
});
