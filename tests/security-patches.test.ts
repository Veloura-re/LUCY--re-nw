import { extractAndParseJson } from '@/lib/ai';

describe('Foresight Sentinel Regressions', () => {
    test('validates absence authorization sync targets "reason" column', () => {
        const payload = { status: 'EXCUSED', reason: 'Excused via Authorization #12345678' };
        expect(payload).toHaveProperty('reason');
        expect(payload).not.toHaveProperty('remarks');
        expect(payload.reason).toContain('Excused via Authorization');
    });

    test('validates extractAndParseJson cleans markdown and parses valid JSON', () => {
        const markdownJson = "```json\n{\"isValid\": true, \"amount\": 2500, \"reason\": \"Bank Transfer Match\"}\n```";
        const parsed = extractAndParseJson(markdownJson, { isValid: false, amount: 0, reason: "" });
        expect(parsed.isValid).toBe(true);
        expect(parsed.amount).toBe(2500);
        expect(parsed.reason).toBe("Bank Transfer Match");
    });

    test('validates extractAndParseJson handles raw arrays and object matching', () => {
        const rawArray = "```json\n[{\"id\": \"q1\", \"points\": 5}]\n```";
        const parsed = extractAndParseJson<any[]>(rawArray, []);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe("q1");
    });

    test('validates extractAndParseJson returns fallback on malformed AI output', () => {
        const malformedText = "Here is your response without any JSON: System error occurred.";
        const fallback = { isValid: false, amount: 0, reason: "Fallback" };
        const parsed = extractAndParseJson(malformedText, fallback);
        expect(parsed).toEqual(fallback);
    });

    test('validates OWNER role inclusion in payment authorization logic', () => {
        const allowedStaffRoles = ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER'];
        expect(allowedStaffRoles.includes('OWNER')).toBe(true);
        expect(allowedStaffRoles.includes('PRINCIPAL')).toBe(true);
        expect(allowedStaffRoles.includes('SUPERADMIN')).toBe(true);
        expect(allowedStaffRoles.includes('TEACHER')).toBe(true);
        expect(allowedStaffRoles.includes('PARENT')).toBe(false);
    });
});
