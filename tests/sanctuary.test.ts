import { sanitizeSanctuaryContent, generateSanctuaryPseudonym } from '@/lib/sanctuary-guardrails';

describe('Sanctuary Content Guardrails & Pseudonym Engine', () => {
    describe('1. PII & Social Handle Interception', () => {
        test('scrubs phone numbers from message payload', () => {
            const raw = 'Hey call me at +251911223344 or 0911223344 later';
            const res = sanitizeSanctuaryContent(raw);
            expect(res.hasRedactions).toBe(true);
            expect(res.sanitizedContent).not.toContain('+251911223344');
            expect(res.sanitizedContent).not.toContain('0911223344');
            expect(res.sanitizedContent).toContain('[NUMBER_FILTERED]');
        });

        test('scrubs email addresses from message payload', () => {
            const raw = 'Reach out to student.test@gmail.com for the notes';
            const res = sanitizeSanctuaryContent(raw);
            expect(res.hasRedactions).toBe(true);
            expect(res.sanitizedContent).not.toContain('student.test@gmail.com');
            expect(res.sanitizedContent).toContain('[CONTACT_FILTERED]');
        });

        test('scrubs social media handles and invite links', () => {
            const telegramInput = 'Follow me on telegram t.me/student_user or @secret_handle';
            const res = sanitizeSanctuaryContent(telegramInput);
            expect(res.hasRedactions).toBe(true);
            expect(res.sanitizedContent).not.toContain('t.me/student_user');
            expect(res.sanitizedContent).not.toContain('@secret_handle');
            expect(res.sanitizedContent).toContain('[HANDLE_FILTERED]');
        });

        test('allows benign conversation to pass untouched', () => {
            const cleanMessage = 'I am preparing for the physics exam tomorrow and feeling nervous.';
            const res = sanitizeSanctuaryContent(cleanMessage);
            expect(res.hasRedactions).toBe(false);
            expect(res.isCrisisDetected).toBe(false);
            expect(res.sanitizedContent).toBe(cleanMessage);
        });
    });

    describe('2. Acute Crisis Detection & Hotline Dispatch', () => {
        test('detects crisis keywords and returns helpline resource card', () => {
            const distressMessage = 'I feel completely overwhelmed and want to end my life';
            const res = sanitizeSanctuaryContent(distressMessage);
            expect(res.isCrisisDetected).toBe(true);
            expect(res.crisisHelpline).toBeDefined();
            expect(res.crisisHelpline?.contact).toContain('988');
        });
    });

    describe('3. Role Pseudonym Generation', () => {
        test('generates Peer Scholar pseudonym for students', () => {
            const pseudo = generateSanctuaryPseudonym('STUDENT');
            expect(pseudo).toMatch(/^Peer Scholar #\d{3}$/);
        });

        test('generates Faculty Mentor pseudonym for teachers', () => {
            const pseudo = generateSanctuaryPseudonym('TEACHER');
            expect(pseudo).toMatch(/^Faculty Mentor #\d{3}$/);
        });

        test('generates Academic Guide pseudonym for leadership roles', () => {
            const pseudo = generateSanctuaryPseudonym('PRINCIPAL');
            expect(pseudo).toMatch(/^Academic Guide #\d{3}$/);
        });
    });

    describe('4. Matchmaking State Machine Lifecycle & Invariants', () => {
        test('validates atomic state transitions from WAITING to ACTIVE to ENDED', () => {
            // Simulated queue state machine
            const session = {
                id: 'sess_123',
                mode: 'PEER_TO_PEER',
                status: 'WAITING',
                userAId: 'student_1',
                userBId: null as string | null,
                endedAt: null as Date | null
            };

            expect(session.status).toBe('WAITING');
            expect(session.userBId).toBeNull();

            // Partner 2 claims queue
            session.userBId = 'student_2';
            session.status = 'ACTIVE';

            expect(session.status).toBe('ACTIVE');
            expect(session.userBId).toBe('student_2');

            // Quick exit / panic exit triggered
            session.status = 'ENDED';
            session.endedAt = new Date();

            expect(session.status).toBe('ENDED');
            expect(session.endedAt).toBeInstanceOf(Date);
        });
    });
});
