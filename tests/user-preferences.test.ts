import { mergeUserPreferences, pickUserPreferences } from "@/lib/user-preferences";

describe("User preference whitelist", () => {
    it("drops server-owned flags supplied by the client", () => {
        expect(pickUserPreferences({ fullAccess: true, immersiveVisuals: false })).toEqual({ immersiveVisuals: false });
    });

    it("never lets untrusted input set fullAccess", () => {
        const merged = mergeUserPreferences({ chatSounds: true }, { fullAccess: true });
        expect(merged.fullAccess).toBeUndefined();
        expect(merged.chatSounds).toBe(true);
    });

    it("preserves an existing server-owned fullAccess flag when the client sends other values", () => {
        const merged = mergeUserPreferences({ fullAccess: true }, { fullAccess: false, smartSync: true });
        expect(merged.fullAccess).toBe(true);
        expect(merged.smartSync).toBe(true);
    });

    it("ignores values of the wrong type and non-object input", () => {
        expect(pickUserPreferences({ chatSounds: "yes", smartSync: 1 })).toEqual({});
        expect(pickUserPreferences(null)).toEqual({});
        expect(pickUserPreferences([true])).toEqual({});
    });

    it("tolerates preferences stored as a JSON string", () => {
        expect(mergeUserPreferences('{"fullAccess":true}', { emailAlerts: false })).toEqual({ fullAccess: true, emailAlerts: false });
        expect(mergeUserPreferences("not-json", { emailAlerts: false })).toEqual({ emailAlerts: false });
    });
});
