import { parseReceiptImage, sanitizeAiNote, MAX_RECEIPT_BYTES } from "@/lib/receipt-evidence";

describe("Receipt image validation", () => {
    it("accepts a small base64 PNG data URI", () => {
        const parsed = parseReceiptImage("data:image/png;base64,iVBORw0KGgo=");
        expect(parsed).toEqual({ base64: "iVBORw0KGgo=", mimeType: "image/png" });
    });

    it("rejects SVG, HTML and non-image types", () => {
        expect(parseReceiptImage("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
        expect(parseReceiptImage("data:text/html;base64,PGh0bWw+")).toBeNull();
    });

    it("rejects non-strings, raw base64 and malformed URIs", () => {
        expect(parseReceiptImage(undefined)).toBeNull();
        expect(parseReceiptImage({})).toBeNull();
        expect(parseReceiptImage("iVBORw0KGgo=")).toBeNull();
        expect(parseReceiptImage("data:image/png;base64,not base64!")).toBeNull();
    });

    it("rejects payloads over the size limit", () => {
        const big = "A".repeat(Math.ceil((MAX_RECEIPT_BYTES * 4) / 3) + 8);
        expect(parseReceiptImage(`data:image/jpeg;base64,${big}`)).toBeNull();
    });
});

describe("AI note sanitization", () => {
    it("flattens control characters, markup and length", () => {
        expect(sanitizeAiNote("ok\n<script>x</script>\tdone")).toBe("ok script x /script done");
        expect(sanitizeAiNote("a".repeat(500)).length).toBe(160);
        expect(sanitizeAiNote(42)).toBe("");
    });
});
