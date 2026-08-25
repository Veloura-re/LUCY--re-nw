import { sanitizeSanctuaryContent, generateSanctuaryPseudonym, normalizeObfuscatedText } from '@/lib/sanctuary-guardrails';

describe('Sanctuary Guardrails & Moderation Engine Tests', () => {
    test('scrubs explicit email addresses', () => {
        const input = 'Hey contact me at student123@gmail.com for the answers';
        const res = sanitizeSanctuaryContent(input);
        expect(res.hasRedactions).toBe(true);
        expect(res.sanitizedContent).toContain('[CONTACT_FILTERED]');
        expect(res.sanitizedContent).not.toContain('student123@gmail.com');
        expect(res.threatTypes).toContain('PII_EMAIL');
    });

    test('scrubs phone numbers and spaced phone numbers', () => {
        const input1 = 'Call my mobile +251911234567';
        const res1 = sanitizeSanctuaryContent(input1);
        expect(res1.hasRedactions).toBe(true);
        expect(res1.sanitizedContent).toContain('[NUMBER_FILTERED]');
        expect(res1.threatTypes).toContain('PII_PHONE');

        const input2 = 'My number is 0 9 1 1 2 3 4 5 6 7 text me';
        const res2 = sanitizeSanctuaryContent(input2);
        expect(res2.hasRedactions).toBe(true);
        expect(res2.sanitizedContent).toContain('[NUMBER_FILTERED]');
        expect(res2.threatTypes).toContain('PII_PHONE');
    });

    test('scrubs social media links and off-platform handles', () => {
        const input1 = 'Follow me on https://instagram.com/student_official';
        const res1 = sanitizeSanctuaryContent(input1);
        expect(res1.hasRedactions).toBe(true);
        expect(res1.sanitizedContent).toContain('[HANDLE_FILTERED]');
        expect(res1.threatTypes).toContain('SOCIAL_HANDLE');

        const input2 = 'add my snap: cool_student99';
        const res2 = sanitizeSanctuaryContent(input2);
        expect(res2.hasRedactions).toBe(true);
        expect(res2.sanitizedContent).toContain('[OFF_PLATFORM_CONTACT_FILTERED]');
        expect(res2.threatTypes).toContain('SOCIAL_HANDLE');
    });

    test('normalizes leetspeak and collapses spaced text', () => {
        const input = 's u 1 c 1 d 3';
        const { normalized, collapsed } = normalizeObfuscatedText(input);
        expect(normalized).toContain('s u i c i d e');
        expect(collapsed).toContain('suicide');
    });

    test('detects obfuscated acute crisis distress keywords and attaches helpline', () => {
        const input1 = 'I feel like ending my life, everything is too hard';
        const res1 = sanitizeSanctuaryContent(input1);
        expect(res1.isCrisisDetected).toBe(true);
        expect(res1.threatTypes).toContain('ACUTE_CRISIS');
        expect(res1.crisisHelpline).toBeDefined();

        const input2 = 'i want to $ u 1 c 1 d 3';
        const res2 = sanitizeSanctuaryContent(input2);
        expect(res2.isCrisisDetected).toBe(true);
        expect(res2.threatTypes).toContain('ACUTE_CRISIS');
    });

    test('scrubs direct and whitespace-separated toxic language', () => {
        const input1 = 'you are a bitch';
        const res1 = sanitizeSanctuaryContent(input1);
        expect(res1.hasRedactions).toBe(true);
        expect(res1.sanitizedContent).toContain('[INAPPROPRIATE_LANGUAGE_FILTERED]');
        expect(res1.threatTypes).toContain('TOXIC_LANGUAGE');

        const input2 = 'you are a b . i . t . c . h';
        const res2 = sanitizeSanctuaryContent(input2);
        expect(res2.hasRedactions).toBe(true);
        expect(res2.threatTypes).toContain('TOXIC_LANGUAGE');
    });

    test('generates anonymous pseudonyms by role', () => {
        const studentPseudo = generateSanctuaryPseudonym('STUDENT');
        expect(studentPseudo).toMatch(/Peer Scholar #\d{3}/);

        const teacherPseudo = generateSanctuaryPseudonym('TEACHER');
        expect(teacherPseudo).toMatch(/Faculty Mentor #\d{3}/);

        const adminPseudo = generateSanctuaryPseudonym('PRINCIPAL');
        expect(adminPseudo).toMatch(/Academic Guide #\d{3}/);
    });
});
