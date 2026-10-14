/**
 * USD to ETB conversion for pricing local (Chapa) payments.
 *
 * Source order: USD_ETB_RATE_OVERRIDE (set this to a commercial bank's selling rate if you want it
 * exact), then a live market rate, then the last good cached rate, then USD_ETB_RATE_FALLBACK.
 * When none is available a quote is refused rather than invented.
 */

const SOURCES: Array<{ name: string; url: string; read: (body: any) => unknown }> = [
    { name: 'open.er-api.com', url: 'https://open.er-api.com/v6/latest/USD', read: b => b?.rates?.ETB },
    {
        name: 'currency-api',
        url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        read: b => b?.usd?.etb,
    },
];

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
// Guards against a malformed response producing an absurd price
const MIN_PLAUSIBLE_RATE = 30;
const MAX_PLAUSIBLE_RATE = 2000;

let cache: { rate: number; source: string; fetchedAt: number } | null = null;

export type FxRate = { rate: number; source: string };

function parseRate(value: unknown): number | null {
    const n = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    return Number.isFinite(n) && n >= MIN_PLAUSIBLE_RATE && n <= MAX_PLAUSIBLE_RATE ? n : null;
}

async function fetchLiveRate(): Promise<FxRate | null> {
    for (const source of SOURCES) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(source.url, { signal: controller.signal });
            if (!res.ok) continue;
            const rate = parseRate(source.read(await res.json()));
            if (rate) return { rate, source: source.name };
        } catch (e) {
            console.warn(`[fx] ${source.name} unavailable:`, (e as Error).message);
        } finally {
            clearTimeout(timer);
        }
    }
    return null;
}

export async function getUsdToEtbRate(): Promise<FxRate | null> {
    const override = parseRate(process.env.USD_ETB_RATE_OVERRIDE);
    if (override) return { rate: override, source: 'override' };

    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return { rate: cache.rate, source: cache.source };
    }

    const live = await fetchLiveRate();
    if (live) {
        cache = { ...live, fetchedAt: Date.now() };
        return live;
    }

    // Stale but real beats invented
    if (cache) return { rate: cache.rate, source: `${cache.source} (stale)` };

    const fallback = parseRate(process.env.USD_ETB_RATE_FALLBACK);
    return fallback ? { rate: fallback, source: 'fallback' } : null;
}

export type EtbQuote = { amountEtb: number; rate: number; source: string; marginPercent: number };

/**
 * Price in ETB for a USD amount. A margin (default 2 percent, FX_MARGIN_PERCENT) covers the gap
 * between market and bank selling rates and short-term movement. Rounded up to the next 10 birr.
 */
export async function quoteUsdInEtb(usd: number): Promise<EtbQuote | null> {
    const fx = await getUsdToEtbRate();
    if (!fx) return null;

    const configured = parseFloat(process.env.FX_MARGIN_PERCENT ?? '');
    const marginPercent = Number.isFinite(configured) && configured >= 0 && configured <= 20 ? configured : 2;

    const amountEtb = Math.ceil((usd * fx.rate * (1 + marginPercent / 100)) / 10) * 10;
    return { amountEtb, rate: fx.rate, source: fx.source, marginPercent };
}

/** Test hook: forget the cached rate. */
export function resetFxCache() {
    cache = null;
}
