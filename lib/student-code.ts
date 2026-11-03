/**
 * A student code alone is not a credential: it is printed on paperwork and short enough to guess
 * across many attempts. Claiming or linking a student also requires the student's date of birth
 * as recorded by the school. A student without a recorded date of birth cannot be claimed or
 * linked until the school adds one.
 */
export function dobMatches(recorded: Date | string | null | undefined, supplied: unknown): boolean {
    if (!recorded || typeof supplied !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(supplied.trim())) return false;
    const recordedDay = new Date(recorded);
    const suppliedDay = new Date(supplied.trim());
    if (isNaN(recordedDay.getTime()) || isNaN(suppliedDay.getTime())) return false;
    return recordedDay.toISOString().slice(0, 10) === suppliedDay.toISOString().slice(0, 10);
}

export const INVALID_CODE_OR_DOB = 'The student code or date of birth does not match our records.';
