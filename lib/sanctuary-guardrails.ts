/**
 * Sanctuary Guardrails & Content Safety Engine - LUCY OS
 *
 * Provides multi-stage normalization, leetspeak translation, whitespace collapsing,
 * PII interception, obfuscated handle scrubbing, profanity/toxic language filtering,
 * acute crisis detection, threat category classification, and deterministic pseudonym generation.
 */

export type SanctuaryThreatType = 'PII_PHONE' | 'PII_EMAIL' | 'SOCIAL_HANDLE' | 'ACUTE_CRISIS' | 'TOXIC_LANGUAGE';

export interface SanctuarySafetyResult {
    sanitizedContent: string;
    hasRedactions: boolean;
    isCrisisDetected: boolean;
    threatTypes: SanctuaryThreatType[];
    crisisHelpline?: {
        name: string;
        contact: string;
        description: string;
    };
}

// Regex filters for standard and spaced PII & off-platform handles
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;
const SPATIAL_DIGITS_REGEX = /(?:\+?\d[\s.-]*){7,15}\d/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_HANDLES_REGEX = /(?:@|(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|instagram\.com|tiktok\.com|discord\.(?:gg|com\/invite)|snapchat\.com|wa\.me|facebook\.com)\/)[a-zA-Z0-9_.-]+/gi;
const OBFUSCATED_SOCIAL_REGEX = /\b(?:snap|insta|ig|telegram|tg|discord|tiktok|whatsapp|wa|phone|call me|dm me|add me)\s*(?::|at|@|\.|\-)?\s*([a-zA-Z0-9_.-]{3,30})\b/gi;

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
    'better off dead',
    'tired of living'
];

// Profanity, hate speech, and harassment keyword matrix
const TOXIC_WORDS = [
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'bastard',
    'dick',
    'pussy',
    'slut',
    'whore',
    'nigger',
    'faggot',
    'retard',
    'cunt',
    'doxx you',
    'leak your',
    'ruin your life'
];

// Leetspeak character map
const LEET_MAP: Record<string, string> = {
    '@': 'a', '4': 'a',
    '3': 'e',
    '1': 'i', '!': 'i', '|': 'i',
    '0': 'o',
    '5': 's', '$': 's',
    '7': 't', '+': 't',
    '8': 'b',
    '9': 'g'
};

/**
 * Normalizes text by translating leetspeak and collapsing single-letter spacing/punctuation.
 */
export function normalizeObfuscatedText(input: string): { normalized: string; collapsed: string } {
    let normalized = input.toLowerCase();

    // 1. Substitute leetspeak symbols
    for (const [leet, char] of Object.entries(LEET_MAP)) {
        normalized = normalized.replaceAll(leet, char);
    }

    // 2. Collapse inter-character spacing and punctuation: "s u i c i d e" -> "suicide", "k.i.l.l" -> "kill"
    let collapsed = normalized;
    // Repeat to collapse multi-spaced letters
    for (let i = 0; i < 5; i++) {
        collapsed = collapsed
            .replace(/([a-z0-9])[\s._\-*~#^]+([a-z0-9])/g, '$1$2');
    }

    return { normalized, collapsed };
}

/**
 * Scrubs PII, obfuscated contacts, profanity, and off-platform handles from message content.
 */
export function sanitizeSanctuaryContent(rawContent: string): SanctuarySafetyResult {
    if (!rawContent || typeof rawContent !== 'string') {
        return {
            sanitizedContent: '',
            hasRedactions: false,
            isCrisisDetected: false,
            threatTypes: []
        };
    }

    let sanitized = rawContent.trim();
    let hasRedactions = false;
    const threatTypes: SanctuaryThreatType[] = [];

    // 1. Scrub Emails
    if (EMAIL_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(EMAIL_REGEX, '[CONTACT_FILTERED]');
        hasRedactions = true;
        if (!threatTypes.includes('PII_EMAIL')) threatTypes.push('PII_EMAIL');
    }

    // 2. Scrub Standard Social Media Links and Handles
    if (SOCIAL_HANDLES_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(SOCIAL_HANDLES_REGEX, '[HANDLE_FILTERED]');
        hasRedactions = true;
        if (!threatTypes.includes('SOCIAL_HANDLE')) threatTypes.push('SOCIAL_HANDLE');
    }

    // 3. Scrub Obfuscated Social Media / DM solicitation
    if (OBFUSCATED_SOCIAL_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(OBFUSCATED_SOCIAL_REGEX, (match, handle) => {
            if (handle && handle.length >= 3 && !['the', 'and', 'for', 'you', 'now', 'pls', 'why'].includes(handle.toLowerCase())) {
                hasRedactions = true;
                if (!threatTypes.includes('SOCIAL_HANDLE')) threatTypes.push('SOCIAL_HANDLE');
                return '[OFF_PLATFORM_CONTACT_FILTERED]';
            }
            return match;
        });
    }

    // 4. Scrub Phone Numbers (including spaced numbers e.g. "0 9 1 1 2 3 4 5 6 7")
    if (SPATIAL_DIGITS_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(SPATIAL_DIGITS_REGEX, (match) => {
            const digitCount = match.replace(/\D/g, '').length;
            if (digitCount >= 7) {
                hasRedactions = true;
                if (!threatTypes.includes('PII_PHONE')) threatTypes.push('PII_PHONE');
                return '[NUMBER_FILTERED]';
            }
            return match;
        });
    } else if (PHONE_REGEX.test(sanitized)) {
        sanitized = sanitized.replace(PHONE_REGEX, (match) => {
            const digitCount = match.replace(/\D/g, '').length;
            if (digitCount >= 7) {
                hasRedactions = true;
                if (!threatTypes.includes('PII_PHONE')) threatTypes.push('PII_PHONE');
                return '[NUMBER_FILTERED]';
            }
            return match;
        });
    }

    // 5. Normalization for Obfuscated Bad Words & Crisis Phrasing
    const { normalized, collapsed } = normalizeObfuscatedText(sanitized);

    // 6. Scrub Toxic & Abusive Language (handles both direct and spaced/leetspeak variants)
    for (const badWord of TOXIC_WORDS) {
        // Direct regex for word boundary with optional punctuation/spacing inside
        const spacedRegexPattern = badWord.split('').map(c => `${c}+`).join('[\\s._\\-*~#^]*');
        const toxicRegex = new RegExp(`\\b${spacedRegexPattern}\\b`, 'gi');

        if (toxicRegex.test(sanitized) || collapsed.includes(badWord.replace(/\s+/g, ''))) {
            sanitized = sanitized.replace(toxicRegex, '[INAPPROPRIATE_LANGUAGE_FILTERED]');
            hasRedactions = true;
            if (!threatTypes.includes('TOXIC_LANGUAGE')) threatTypes.push('TOXIC_LANGUAGE');
        }
    }

    // 7. Crisis Watchdog (checks raw, normalized, and collapsed text)
    const isCrisisDetected = CRISIS_KEYWORDS.some(kw => {
        const kwCollapsed = kw.replace(/\s+/g, '');
        return sanitized.toLowerCase().includes(kw) || 
               normalized.includes(kw) || 
               collapsed.includes(kwCollapsed);
    });

    if (isCrisisDetected) {
        if (!threatTypes.includes('ACUTE_CRISIS')) threatTypes.push('ACUTE_CRISIS');
    }

    const result: SanctuarySafetyResult = {
        sanitizedContent: sanitized,
        hasRedactions,
        isCrisisDetected,
        threatTypes
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
    const randomId = Math.floor(100 + (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 900);
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
