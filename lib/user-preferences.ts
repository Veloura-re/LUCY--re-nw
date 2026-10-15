/**
 * User preference handling.
 *
 * `User.preferences` mixes two kinds of data:
 *   - user-controlled UI toggles (safe for the user to write), and
 *   - server-owned flags such as `fullAccess`, which gate privileged actions and must only be
 *     changed by trusted server routes (for example the Owner-only principal management route).
 *
 * All user-facing write paths must go through `mergeUserPreferences` so that a client can never
 * set or overwrite a server-owned key.
 */

const USER_BOOLEAN_PREFERENCES = [
    'immersiveVisuals',
    'smartSync',
    'neuralSync',
    'emailAlerts',
    'chatSounds',
] as const;

export type UserPreferenceKey = (typeof USER_BOOLEAN_PREFERENCES)[number];

function toPlainObject(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return value && typeof value === 'object' && !Array.isArray(value)
        ? { ...(value as Record<string, unknown>) }
        : {};
}

/**
 * Extracts only the whitelisted, correctly typed user preferences from untrusted input.
 */
export function pickUserPreferences(input: unknown): Partial<Record<UserPreferenceKey, boolean>> {
    const source = toPlainObject(input);
    const result: Partial<Record<UserPreferenceKey, boolean>> = {};
    for (const key of USER_BOOLEAN_PREFERENCES) {
        if (typeof source[key] === 'boolean') {
            result[key] = source[key] as boolean;
        }
    }
    return result;
}

/**
 * Merges untrusted input into the stored preferences. Existing keys outside the whitelist
 * (including server-owned flags) are preserved untouched; untrusted values for them are ignored.
 */
export function mergeUserPreferences(existing: unknown, untrusted: unknown): Record<string, any> {
    return { ...toPlainObject(existing), ...pickUserPreferences(untrusted) };
}
