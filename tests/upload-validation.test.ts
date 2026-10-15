import { validateUpload, matchesSignature, IMAGE_RULES, GENERAL_RULES, BOOK_FILE_RULES, resolveUploadFolder } from "@/lib/upload-validation";

function makeFile(bytes: number[], type: string, name = "f.bin", pad = 0): File {
    const data = new Uint8Array(bytes.length + pad);
    data.set(bytes);
    return new File([data], name, { type });
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("validateUpload", () => {
    it("accepts a real PNG and derives the extension from the verified type, not the name", async () => {
        const result = await validateUpload(makeFile(PNG, "image/png", "evil.html"), IMAGE_RULES);
        expect(result.ok).toBe(true);
        expect(result.extension).toBe("png");
    });

    it("rejects SVG and HTML even when declared as images", async () => {
        const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'], "x.svg", { type: "image/svg+xml" });
        expect((await validateUpload(svg, GENERAL_RULES)).ok).toBe(false);
        const html = new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" });
        const result = await validateUpload(html, IMAGE_RULES);
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/does not match/);
    });

    it("rejects oversized and empty files", async () => {
        const big = makeFile(PNG, "image/png", "big.png", 6 * 1024 * 1024);
        expect((await validateUpload(big, IMAGE_RULES)).ok).toBe(false);
        expect((await validateUpload(new File([], "e.png", { type: "image/png" }), IMAGE_RULES)).ok).toBe(false);
    });

    it("restricts book files to PDF", async () => {
        expect((await validateUpload(makeFile([0x25, 0x50, 0x44, 0x46], "application/pdf"), BOOK_FILE_RULES)).ok).toBe(true);
        expect((await validateUpload(makeFile(PNG, "image/png"), BOOK_FILE_RULES)).ok).toBe(false);
    });

    it("rejects non-file values", async () => {
        expect((await validateUpload(null, IMAGE_RULES)).ok).toBe(false);
        expect((await validateUpload("string", IMAGE_RULES)).ok).toBe(false);
    });
});

describe("matchesSignature and folders", () => {
    it("treats text containing NUL bytes as binary", () => {
        expect(matchesSignature("txt", new Uint8Array([0x68, 0x69]))).toBe(true);
        expect(matchesSignature("txt", new Uint8Array([0x68, 0x00]))).toBe(false);
    });

    it("maps unknown upload folders to avatars", () => {
        expect(resolveUploadFolder("../../etc")).toBe("avatars");
        expect(resolveUploadFolder("logos")).toBe("logos");
    });
});
