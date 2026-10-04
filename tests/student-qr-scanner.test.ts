import {
    parseScannedQrData,
    signStudentPayload,
    verifyStudentSignature,
    generateStudentQrUrl
} from "@/lib/student-id-security";

describe("Student ID Security & QR Parsing", () => {
    const studentId = "b1234567-89ab-cdef-0123-456789abcdef";
    const schoolIdA = "school-alpha-001";
    const schoolIdB = "school-beta-002";
    const studentCode = "STU-2026-0042";
    const origin = "https://campus.lucy.app";

    describe("Cryptographic Signature Verification", () => {
        it("generates and verifies a valid HMAC signature for a student and school", () => {
            const sig = signStudentPayload(studentId, schoolIdA);
            expect(typeof sig).toBe("string");
            expect(sig.length).toBe(16);

            const isValid = verifyStudentSignature(studentId, schoolIdA, sig);
            expect(isValid).toBe(true);
        });

        it("fails verification if the schoolId is changed (cross-school spoofing attempt)", () => {
            const sigA = signStudentPayload(studentId, schoolIdA);
            const isValidForSchoolB = verifyStudentSignature(studentId, schoolIdB, sigA);
            expect(isValidForSchoolB).toBe(false);
        });

        it("fails verification if signature is tampered with or malformed", () => {
            const isValid = verifyStudentSignature(studentId, schoolIdA, "tampered-sig-123");
            expect(isValid).toBe(false);
        });
    });

    describe("generateStudentQrUrl", () => {
        it("creates a properly encoded institutional URL with tenant metadata and signature", () => {
            const url = generateStudentQrUrl(origin, studentId, schoolIdA, studentCode);
            expect(url).toContain(`/verify/student/${studentId}`);
            expect(url).toContain(`sid=${schoolIdA}`);
            expect(url).toContain(`code=${studentCode}`);
            expect(url).toContain("sig=");
        });
    });

    describe("parseScannedQrData", () => {
        it("correctly parses a full signed verification URL", () => {
            const url = generateStudentQrUrl(origin, studentId, schoolIdA, studentCode);
            const parsed = parseScannedQrData(url);

            expect(parsed.isUrl).toBe(true);
            expect(parsed.studentId).toBe(studentId);
            expect(parsed.schoolId).toBe(schoolIdA);
            expect(parsed.studentCode).toBe(studentCode);
            expect(parsed.signature).toBeDefined();
        });

        it("correctly parses relative pathnames", () => {
            const path = `/verify/student/${studentId}?sid=${schoolIdA}&code=${studentCode}`;
            const parsed = parseScannedQrData(path);

            expect(parsed.isUrl).toBe(true);
            expect(parsed.studentId).toBe(studentId);
            expect(parsed.schoolId).toBe(schoolIdA);
            expect(parsed.studentCode).toBe(studentCode);
        });

        it("correctly parses JSON QR payloads", () => {
            const jsonPayload = JSON.stringify({
                type: "LUCY_ID",
                studentId,
                schoolId: schoolIdA,
                studentCode
            });
            const parsed = parseScannedQrData(jsonPayload);

            expect(parsed.isUrl).toBe(false);
            expect(parsed.studentId).toBe(studentId);
            expect(parsed.schoolId).toBe(schoolIdA);
            expect(parsed.studentCode).toBe(studentCode);
        });

        it("correctly parses a standalone student code", () => {
            const parsed = parseScannedQrData("STU-9921");
            expect(parsed.isUrl).toBe(false);
            expect(parsed.studentCode).toBe("STU-9921");
            expect(parsed.studentId).toBeNull();
        });

        it("correctly parses a standalone UUID student ID", () => {
            const parsed = parseScannedQrData(studentId);
            expect(parsed.isUrl).toBe(false);
            expect(parsed.studentId).toBe(studentId);
        });
    });
});
