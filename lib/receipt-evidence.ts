/**
 * Helpers for handling parent-submitted payment receipt images.
 *
 * A receipt image is untrusted input. It is only ever used as advisory evidence for a human
 * reviewer: nothing derived from it may settle an invoice.
 */

const ALLOWED_RECEIPT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Maximum decoded receipt size (4 MB). */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

export interface ParsedReceipt {
    base64: string;
    mimeType: string;
}

/**
 * Parses a `data:image/...;base64,...` URI. Returns null for anything that is not a bounded
 * JPEG, PNG or WebP image encoded as base64.
 */
export function parseReceiptImage(input: unknown): ParsedReceipt | null {
    if (typeof input !== 'string') return null;
    const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(input);
    if (!match) return null;

    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_RECEIPT_MIME.has(mimeType)) return null;

    const base64 = match[2];
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const decodedBytes = Math.floor((base64.length * 3) / 4) - padding;
    if (decodedBytes <= 0 || decodedBytes > MAX_RECEIPT_BYTES) return null;

    return { base64, mimeType };
}

/**
 * Reduces model output to a short, single-line, printable note that is safe to store on a
 * payment reference and show to staff.
 */
export function sanitizeAiNote(value: unknown, maxLength = 160): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}
