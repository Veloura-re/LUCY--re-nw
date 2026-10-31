import type { Role } from '@prisma/client';

/** Roles a director can invite by email from the Finance & Records Staff page. */
export const INVITABLE_STAFF_ROLES = ['ACCOUNTANT', 'RECORDER'] as const;
export type InvitableStaffRole = (typeof INVITABLE_STAFF_ROLES)[number];

export function isInvitableStaffRole(value: unknown): value is InvitableStaffRole {
    return typeof value === 'string' && (INVITABLE_STAFF_ROLES as readonly string[]).includes(value);
}

export const STAFF_ROLE_LABELS: Record<InvitableStaffRole, string> = {
    ACCOUNTANT: 'Accountant',
    RECORDER: 'Recorder',
};

export const STAFF_ROLE_SCOPE: Record<InvitableStaffRole, string> = {
    ACCOUNTANT: 'Fees, invoices, expenses, payroll and payments',
    RECORDER: 'Student, parent and class records',
};

/** Prisma filter value for "any invitable staff role". */
export const INVITABLE_STAFF_ROLE_FILTER = { in: [...INVITABLE_STAFF_ROLES] as Role[] };
