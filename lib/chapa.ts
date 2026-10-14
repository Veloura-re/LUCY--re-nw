/** Monthly platform subscription price charged through Chapa, in ETB. */
export const CHAPA_SUBSCRIPTION_AMOUNT_ETB = 5880;
export const CHAPA_CURRENCY = 'ETB';

/** Days of platform access one subscription payment buys. */
export const CHAPA_ACCESS_DAYS = 30;

/** Payments whose checkout was created longer ago than this are treated as stale and ignored. */
export const CHAPA_MAX_TX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TX_REF_PATTERN = /^tx-(.+)-(\d{10,16})$/;

/**
 * Parses a tx_ref of the form "tx-<schoolId>-<epochMs>" created by the checkout route.
 * The school id may itself contain dashes, so the timestamp is taken from the final segment.
 */
export function parseChapaTxRef(txRef: string): { schoolId: string; createdAt: number } | null {
    const match = TX_REF_PATTERN.exec(txRef);
    if (!match) return null;
    return { schoolId: match[1], createdAt: Number(match[2]) };
}

export type ChapaVerification = {
    ok: boolean;
    reason?: 'NOT_PAID' | 'AMOUNT_MISMATCH' | 'UNREACHABLE';
};

/**
 * Confirms a transaction with Chapa instead of trusting the webhook body.
 * UNREACHABLE means Chapa could not be queried and the caller should ask for a retry.
 */
export async function verifyChapaTransaction(txRef: string): Promise<ChapaVerification> {
    const secret = process.env.CHAPA_SECRET_KEY;
    if (!secret) return { ok: false, reason: 'UNREACHABLE' };

    try {
        const res = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
            headers: { Authorization: `Bearer ${secret}` },
        });

        // 4xx from Chapa means the reference is unknown or unpaid; 5xx means try again later.
        if (res.status >= 500) return { ok: false, reason: 'UNREACHABLE' };
        if (!res.ok) return { ok: false, reason: 'NOT_PAID' };

        const body = (await res.json()) as { status?: string; data?: { status?: string; amount?: string | number; currency?: string; tx_ref?: string } };
        const data = body?.data;

        if (body?.status !== 'success' || data?.status !== 'success' || data?.tx_ref !== txRef) {
            return { ok: false, reason: 'NOT_PAID' };
        }
        if (data.currency !== CHAPA_CURRENCY || Number(data.amount) < CHAPA_SUBSCRIPTION_AMOUNT_ETB) {
            return { ok: false, reason: 'AMOUNT_MISMATCH' };
        }
        return { ok: true };
    } catch (e) {
        console.error('[Chapa Verify] Request failed:', e);
        return { ok: false, reason: 'UNREACHABLE' };
    }
}
