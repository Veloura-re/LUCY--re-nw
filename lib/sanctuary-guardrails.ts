/**
 * Sanctuary Guardrails & Content Safety Engine - LUCY OS
 *
 * Provides PII interception, social handle scrubbing, acute crisis detection,
 * and deterministic pseudonym generation for anonymous cross-school communication.
 */

export interface SanctuarySafetyResult {
    sanitizedContent: string;
    hasRedactions: boolean;
    isCrisisDetected: boolean;
    crisisHelpline?: {
        name: string;
        contact: string;
        description: string;
    };
}

// Regex filters for PII and off-platform handles
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_HANDLES_REGEX = /(?:@|(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|instagram\.com|tiktok\.com|discord\.(?:gg|com\/invite)|snapchat\.com|wa\.me|facebook\.com)\/)[a-zA-Z0-9_.-]+/gi;

// Crisis detection keywords (self-harm, acute distress)
const CRISIS_KEYWORDS = [
    'suicide',
    'kill myself',
    'ending my life',
    'end my life',
    'want to die',
    'wanna die',
    'self harm',
    'cutting myself',
    'hurt myself',
    'better off dead'
];

/**
 * Scrubs PII and off-platform connection handles from message content.
 */
export function sanitizeSanctuaryContent(rawContent: string): SanctuarySafetyResult {
    if (!rawContent || typeof rawContent !== 'string') {
        return {
            sanitizedContent: '',
            hasRedactions: false,
            isCrisisDetected: false
        };
    }

    let sanitized = rawContent.trim();
    let hasRedactions = false;

    // 1. Scrub Emails
    if (EMAIL_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(EMAIL_REGEX, '[CONTACT_FILTERED]');
        hasRedactions = true;
    }

    // 2. Scrub Social Media Links and Handles
    if (SOCIAL_HANDLES_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(SOCIAL_HANDLES_REGEX, '[HANDLE_FILTERED]');
        hasRedactions = true;
    }

    // 3. Scrub Phone Numbers (only matches strings with 7+ digits)
    const digitsOnly = sanitized.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && PHONE_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(PHONE_REGEX, (match) => {
            const digitCount = match.replace(/\D/g, '').length;
            return digitCount >= 7 ? '[NUMBER_FILTERED]' : match;
        });
        hasRedactions = true;
    }

    // 4. Crisis Watchdog
    const lower = sanitized.toLowerCase();
    const isCrisisDetected = CRISIS_KEYWORDS.some(kw => lower.includes(kw));

    const result: SanctuarySafetyResult = {
        sanitizedContent: sanitized,
        hasRedactions,
        isCrisisDetected
    };

    if (isCrisisDetected) {
        result.crisisHelpline = {
            name: "Student Support & Crisis Assistance",
            contact: "988 (National Crisis Lifeline) / School Counselor Desk",
            description: "You are not alone. Free, confidential support is available 24/7."
        };
    }

    return result;
}

/**
 * Generates an anonymous pseudonym tailored to participant role.
 */
export function generateSanctuaryPseudonym(role: string): string {
    const randomId = Math.floor(100 + Math.random() * 900);
    switch (role) {
        case 'TEACHER':
        case 'HOMEROOM':
            return `Faculty Mentor #${randomId}`;
        case 'PRINCIPAL':
        case 'OWNER':
        case 'SUPERADMIN':
            return `Academic Guide #${randomId}`;
        case 'STUDENT':
        default:
            return `Peer Scholar #${randomId}`;
    }
}
