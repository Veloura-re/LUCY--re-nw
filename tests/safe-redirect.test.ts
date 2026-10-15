import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
    it("keeps same-origin relative paths", () => {
        expect(safeNextPath("/reset-password")).toBe("/reset-password");
        expect(safeNextPath("/dashboard?tab=1#x")).toBe("/dashboard?tab=1#x");
    });

    it.each([
        "@evil.com",
        "//evil.com",
        "/\\evil.com",
        "https://evil.com",
        "javascript:alert(1)",
        "/ok\nHeader: x",
        "evil.com/path",
        "",
    ])("rejects %j", (value) => {
        expect(safeNextPath(value, "/fallback")).toBe("/fallback");
    });

    it("falls back for null and undefined", () => {
        expect(safeNextPath(null, "/f")).toBe("/f");
        expect(safeNextPath(undefined, "/f")).toBe("/f");
    });
});
