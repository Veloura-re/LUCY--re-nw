import crypto from "crypto";

const QR_SIGNING_SECRET = process.env.QR_HMAC_SECRET || process.env.ADMIN_SECRET_KEY || "lucy-institutional-credential-seal-2026";

/**
 * Creates an HMAC-SHA256 signature for a student and school pair.
 */
export function signStudentPayload(studentId: string, schoolId: string): string {
    return crypto
        .createHmac("sha256", QR_SIGNING_SECRET)
        .update(`${studentId}:${schoolId}`)
        .digest("hex")
        .substring(0, 16);
}

/**
 * Validates the HMAC signature for student credential validation.
 */
export function verifyStudentSignature(studentId: string, schoolId: string, signature: string): boolean {
    if (!signature) return false;
    const expected = signStudentPayload(studentId, schoolId);
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

/**
 * Generates an institutional QR verification URL with tenant metadata.
 */
export function generateStudentQrUrl(
    origin: string,
    studentId: string,
    schoolId?: string,
    studentCode?: string
): string {
    const base = `${origin}/verify/student/${studentId}`;
    const params = new URLSearchParams();
    if (schoolId) {
        params.set("sid", schoolId);
        params.set("sig", signStudentPayload(studentId, schoolId));
    }
    if (studentCode) {
        params.set("code", studentCode);
    }
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

/**
 * Generates an institutional transcript QR verification URL with cryptographic signature.
 */
export function generateTranscriptQrUrl(
    origin: string,
    studentId: string,
    schoolId?: string,
    studentCode?: string
): string {
    const base = `${origin}/verify/student/${studentId}`;
    const params = new URLSearchParams();
    if (schoolId) {
        params.set("sid", schoolId);
        params.set("sig", signStudentPayload(studentId, schoolId));
    }
    if (studentCode) {
        params.set("code", studentCode);
    }
    params.set("type", "transcript");
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

export interface ParsedQrScan {
    raw: string;
    studentId: string | null;
    schoolId: string | null;
    studentCode: string | null;
    signature: string | null;
    isUrl: boolean;
    scanSource?: "verify" | "transcript" | "profile" | "badge" | "raw";
}

/**
 * Parses raw scanner text from a QR code or manual entry.
 * Supports:
 * 1. Full URLs: https://.../verify/student/{studentId}?sid=...&sig=...&code=...
 * 2. Report Card URLs: https://.../dashboard/reports/{studentId} or /reports/{studentId}
 * 3. Student Profile URLs: https://.../dashboard/students/{studentId} or /students/{studentId}
 * 4. JSON tokens: {"type":"LUCY_ID","studentId":"...","schoolId":"..."}
 * 5. Raw student IDs (UUID) or student codes (e.g. STU-1029, APEX-G10-01)
 */
export function parseScannedQrData(raw: string): ParsedQrScan {
    const trimmed = (raw || "").trim();

    const result: ParsedQrScan = {
        raw: trimmed,
        studentId: null,
        schoolId: null,
        studentCode: null,
        signature: null,
        isUrl: false,
        scanSource: "raw"
    };

    if (!trimmed) return result;

    // Check JSON payload
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            const parsed = JSON.parse(trimmed);
            result.studentId = parsed.studentId || parsed.id || null;
            result.schoolId = parsed.schoolId || parsed.sid || null;
            result.studentCode = parsed.studentCode || parsed.code || null;
            result.signature = parsed.signature || parsed.sig || null;
            result.scanSource = "badge";
            return result;
        } catch {
            // Not valid JSON, continue with URL and string matching
        }
    }

    // Check URL or Pathnames:
    // Pattern 1: /verify/student/{id}
    const verifyPattern = /\/verify\/student\/([^/?#]+)/i;
    // Pattern 2: /dashboard/reports/{id} or /reports/{id}
    const reportPattern = /\/(?:dashboard\/)?reports\/([^/?#]+)/i;
    // Pattern 3: /dashboard/students/{id} or /students/{id}
    const studentPattern = /\/(?:dashboard\/)?students\/([^/?#]+)/i;

    const verifyMatch = trimmed.match(verifyPattern);
    const reportMatch = trimmed.match(reportPattern);
    const studentMatch = trimmed.match(studentPattern);

    const activeMatch = verifyMatch || reportMatch || studentMatch;

    if (activeMatch && activeMatch[1]) {
        result.isUrl = true;
        result.studentId = decodeURIComponent(activeMatch[1]);
        result.scanSource = verifyMatch ? "verify" : reportMatch ? "transcript" : "profile";

        try {
            const parsedUrl = new URL(trimmed.startsWith("http") ? trimmed : `https://lucy.internal${trimmed}`);
            result.schoolId = parsedUrl.searchParams.get("sid");
            result.studentCode = parsedUrl.searchParams.get("code");
            result.signature = parsedUrl.searchParams.get("sig");
        } catch {
            // Fallback manual query string parsing
            const queryIndex = trimmed.indexOf("?");
            if (queryIndex !== -1) {
                const searchParams = new URLSearchParams(trimmed.slice(queryIndex));
                result.schoolId = searchParams.get("sid");
                result.studentCode = searchParams.get("code");
                result.signature = searchParams.get("sig");
            }
        }
        return result;
    }

    // Check if UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmed)) {
        result.studentId = trimmed;
        result.scanSource = "raw";
        return result;
    }

    // Treat as student code (e.g., STU-001, APEX-G10-01, 2026-STU-44, etc.)
    result.studentCode = trimmed;
    result.scanSource = "raw";
    return result;
}
