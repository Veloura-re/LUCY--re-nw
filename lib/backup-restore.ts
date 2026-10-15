/**
 * Pure helpers for the backup restore flow.
 *
 * A backup file is uploaded by the caller and is therefore untrusted input: it carries no
 * signature, so every value in it (roles, tenant ids, foreign keys, extra columns) must be
 * treated as attacker controlled. These helpers define what a restore may write.
 */

export type RestoreTable = 'User' | 'Student' | 'Class' | 'Grade' | 'Subject' | 'Invoice' | 'Payment';

/** Columns a restore is allowed to write, per table. Anything else in the file is dropped. */
export const RESTORE_COLUMNS: Record<RestoreTable, readonly string[]> = {
    User: ['id', 'email', 'name', 'gender', 'phone', 'teacherCode', 'photoUrl', 'createdAt'],
    Student: [
        'id', 'classId', 'gradeId', 'firstName', 'lastName', 'email', 'studentCode', 'dob',
        'enrollmentStatus', 'address', 'enrolledAt', 'gender', 'grandfatherName', 'guardianName',
        'guardianPhone', 'guardianRelation', 'photoUrl', 'secondaryPhone',
    ],
    Class: ['id', 'gradeId', 'name', 'homeroomTeacherId'],
    Grade: ['id', 'name', 'level'],
    Subject: ['id', 'name'],
    Invoice: ['id', 'studentId', 'amount', 'dueDate', 'status', 'createdAt', 'updatedAt'],
    Payment: ['id', 'invoiceId', 'amount', 'method', 'reference', 'status', 'createdAt'],
};

/** Tables whose rows carry a `schoolId` column that the restore must force to the caller's school. */
const TENANT_STAMPED: ReadonlySet<RestoreTable> = new Set(['Student', 'Class', 'Grade', 'Subject', 'Invoice']);

/**
 * Keeps only the whitelisted columns of a row and stamps the caller's school on tenant-owned
 * tables. Returns null when the row has no usable string id.
 */
export function sanitizeRestoreRow(
    table: RestoreTable,
    row: unknown,
    schoolId: string
): Record<string, unknown> | null {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    const source = row as Record<string, unknown>;
    if (typeof source.id !== 'string' || source.id.length === 0 || source.id.length > 128) return null;

    const clean: Record<string, unknown> = {};
    for (const column of RESTORE_COLUMNS[table]) {
        if (column in source && source[column] !== undefined) {
            clean[column] = source[column];
        }
    }
    if (TENANT_STAMPED.has(table)) {
        clean.schoolId = schoolId;
    }
    return clean;
}

const STAFF_RESTORE_ROLES = new Set(['TEACHER', 'HOMEROOM']);
const MEMBER_RESTORE_ROLES = new Set(['PARENT', 'STUDENT']);

/**
 * Decides which role a restored (previously missing) user may receive. The role in the backup
 * file is only a request: OWNER and SUPERADMIN are never restorable, and PRINCIPAL can only be
 * restored by an OWNER or SUPERADMIN. Anything unrecognised is rejected (null).
 */
export function resolveRestorableRole(requestedRole: unknown, actorRole: string): string | null {
    if (typeof requestedRole !== 'string') return null;
    if (STAFF_RESTORE_ROLES.has(requestedRole) || MEMBER_RESTORE_ROLES.has(requestedRole)) {
        return requestedRole;
    }
    if (requestedRole === 'PRINCIPAL' && (actorRole === 'OWNER' || actorRole === 'SUPERADMIN')) {
        return requestedRole;
    }
    return null;
}

/** Splits an array into fixed-size chunks (used to keep `in (...)` filters small). */
export function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/** Upper bound on rows accepted per table in a single restore. */
export const MAX_RESTORE_ROWS_PER_TABLE = 20000;

/**
 * Columns of `User` that may appear in a backup file. Credentials and session state
 * (passwordHash, activeSessionId, preferences) must never be exported: backups are plaintext JSON.
 */
export const BACKUP_USER_SELECT = {
    id: true,
    email: true,
    name: true,
    role: true,
    schoolId: true,
    gender: true,
    phone: true,
    teacherCode: true,
    photoUrl: true,
    createdAt: true,
} as const;
