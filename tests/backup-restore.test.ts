import { sanitizeRestoreRow, resolveRestorableRole, chunk } from "@/lib/backup-restore";

describe("Backup restore sanitization", () => {
    const school = "school-a";

    it("forces the caller's schoolId on tenant-owned tables regardless of the file", () => {
        const row = sanitizeRestoreRow("Grade", { id: "g1", name: "Grade 1", level: 1, schoolId: "school-b" }, school);
        expect(row).toEqual({ id: "g1", name: "Grade 1", level: 1, schoolId: school });
    });

    it("drops columns outside the whitelist (role, userId, schoolId on users)", () => {
        const user = sanitizeRestoreRow("User", { id: "u1", email: "a@b.co", name: "A", role: "SUPERADMIN", schoolId: "x", passwordHash: "h" }, school);
        expect(user).toEqual({ id: "u1", email: "a@b.co", name: "A" });
        const student = sanitizeRestoreRow("Student", { id: "s1", firstName: "A", lastName: "B", userId: "victim" }, school);
        expect(student).not.toHaveProperty("userId");
    });

    it("rejects rows without a usable id", () => {
        expect(sanitizeRestoreRow("Class", { name: "x" }, school)).toBeNull();
        expect(sanitizeRestoreRow("Class", null, school)).toBeNull();
        expect(sanitizeRestoreRow("Class", [], school)).toBeNull();
        expect(sanitizeRestoreRow("Class", { id: "" }, school)).toBeNull();
    });
});

describe("Restorable role policy", () => {
    it("never restores OWNER or SUPERADMIN", () => {
        expect(resolveRestorableRole("SUPERADMIN", "OWNER")).toBeNull();
        expect(resolveRestorableRole("OWNER", "SUPERADMIN")).toBeNull();
    });

    it("lets only OWNER or SUPERADMIN restore a PRINCIPAL", () => {
        expect(resolveRestorableRole("PRINCIPAL", "PRINCIPAL")).toBeNull();
        expect(resolveRestorableRole("PRINCIPAL", "OWNER")).toBe("PRINCIPAL");
    });

    it("allows ordinary roles and rejects unknown values", () => {
        expect(resolveRestorableRole("TEACHER", "PRINCIPAL")).toBe("TEACHER");
        expect(resolveRestorableRole("STUDENT", "PRINCIPAL")).toBe("STUDENT");
        expect(resolveRestorableRole("ROOT", "OWNER")).toBeNull();
        expect(resolveRestorableRole(undefined, "OWNER")).toBeNull();
    });
});

describe("chunk", () => {
    it("splits into fixed-size groups", () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunk([], 3)).toEqual([]);
    });
});

import fs from "fs";
import path from "path";
import { BACKUP_USER_SELECT } from "@/lib/backup-restore";

describe("Backup export hygiene", () => {
    it("never selects credential or session columns", () => {
        for (const forbidden of ["passwordHash", "activeSessionId", "preferences"]) {
            expect(Object.keys(BACKUP_USER_SELECT)).not.toContain(forbidden);
        }
    });

    it.each(["app/api/cron/backups/route.ts", "app/api/school/backups/generate/route.ts"])(
        "%s exports users through the safe column list",
        (file) => {
            const src = fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
            expect(src).toMatch(/prisma\.user\.findMany\([^)]*select:\s*BACKUP_USER_SELECT/);
        }
    );
});
