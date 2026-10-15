/**
 * Single source of truth for the Gemini model used across the platform.
 * Override with GEMINI_MODEL without a code change when a model is retired.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
