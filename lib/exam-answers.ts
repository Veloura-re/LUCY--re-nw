/**
 * Normalises untrusted exam answers submitted by a student.
 * Only answers for questions that exist on the exam are kept, values are coerced to bounded
 * strings, and anything that is not a plain object yields an empty result.
 */

const MAX_ANSWER_LENGTH = 10000;

export function normalizeAnswers(answers: unknown, questions: Array<{ id?: unknown }>): Record<string, string> {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
    const source = answers as Record<string, unknown>;
    const result: Record<string, string> = {};

    for (const question of questions) {
        const id = typeof question?.id === 'string' || typeof question?.id === 'number' ? String(question.id) : null;
        if (id === null || !Object.prototype.hasOwnProperty.call(source, id)) continue;

        const value = source[id];
        if (typeof value === 'string') {
            result[id] = value.slice(0, MAX_ANSWER_LENGTH);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            result[id] = String(value);
        }
    }
    return result;
}
