import { getUsdToEtbRate, quoteUsdInEtb, resetFxCache } from '@/lib/fx';

const realFetch = global.fetch;
const mockFetch = jest.fn();
const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
    jest.clearAllMocks();
    resetFxCache();
    global.fetch = mockFetch as any;
    delete process.env.USD_ETB_RATE_OVERRIDE;
    delete process.env.USD_ETB_RATE_FALLBACK;
    delete process.env.FX_MARGIN_PERCENT;
});
afterAll(() => { global.fetch = realFetch; });

describe('quoteUsdInEtb', () => {
    test('applies the live rate and a 2 percent margin, rounded up to the next 10 birr', async () => {
        mockFetch.mockResolvedValue(ok({ rates: { ETB: 161.49 } }));
        const q = await quoteUsdInEtb(49);
        expect(q).toMatchObject({ amountEtb: 8080, source: 'open.er-api.com', marginPercent: 2 }); // 49 * 161.49 * 1.02 = 8071.27
    });

    test('honours a configured margin', async () => {
        process.env.FX_MARGIN_PERCENT = '0';
        mockFetch.mockResolvedValue(ok({ rates: { ETB: 160 } }));
        expect((await quoteUsdInEtb(49))?.amountEtb).toBe(7840);
    });

    test('an override rate beats any live source', async () => {
        process.env.USD_ETB_RATE_OVERRIDE = '170';
        process.env.FX_MARGIN_PERCENT = '0';
        const q = await quoteUsdInEtb(49);
        expect(q).toMatchObject({ amountEtb: 8330, source: 'override' });
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

describe('rate sources', () => {
    test('falls back to the second source when the first fails', async () => {
        mockFetch
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValueOnce(ok({ usd: { etb: 161.87 } }));
        expect(await getUsdToEtbRate()).toEqual({ rate: 161.87, source: 'currency-api' });
    });

    test('rejects implausible rates instead of pricing from them', async () => {
        mockFetch.mockResolvedValue(ok({ rates: { ETB: 1.2 }, usd: { etb: 99999999 } }));
        expect(await getUsdToEtbRate()).toBeNull();
        expect(await quoteUsdInEtb(49)).toBeNull();
    });

    test('caches a good rate and reuses it', async () => {
        mockFetch.mockResolvedValue(ok({ rates: { ETB: 161.49 } }));
        await getUsdToEtbRate();
        await getUsdToEtbRate();
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('uses the configured fallback only when nothing else is available', async () => {
        mockFetch.mockRejectedValue(new Error('offline'));
        expect(await getUsdToEtbRate()).toBeNull();
        process.env.USD_ETB_RATE_FALLBACK = '160';
        expect(await getUsdToEtbRate()).toEqual({ rate: 160, source: 'fallback' });
    });
});
