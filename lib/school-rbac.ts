/**
 * Pure Edge-compatible Role-Based Access Control matrix for the school platform (lucyos.5-cn.net).
 * Enforces strict boundaries between school roles before page load.
 */

export type SchoolRole =
    | 'OWNER'
    | 'PRINCIPAL'
    | 'DIRECTOR'
    | 'TEACHER'
    | 'HOMEROOM'
    | 'PARENT'
    | 'STUDENT'
    | 'ACCOUNTANT'
    | 'RECORDER';

export function isSchoolRoleAllowedForPath(role: string | undefined, path: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toUpperCase();

    // 1. Leadership clearance: Owner, Principal, Director govern institutional operations
    if (normalizedRole === 'OWNER' || normalizedRole === 'PRINCIPAL' || normalizedRole === 'DIRECTOR') {
        // Principal creation / delegation is reserved for Owner only
        if (path.startsWith('/dashboard/principals') && normalizedRole !== 'OWNER') {
            return false;
        }
        return true;
    }

    // 2. Strict restriction: Institutional governance routes are reserved for Owner and Principal
    if (
        path.startsWith('/dashboard/billing') ||
        path.startsWith('/dashboard/principals') ||
        path.startsWith('/dashboard/staff-roles') ||
        path.startsWith('/dashboard/settings/data') ||
        path.startsWith('/dashboard/approvals') ||
        path.startsWith('/dashboard/director')
    ) {
        return false;
    }

    // 3. Shared campus hubs accessible to all verified school members
    if (
        path === '/dashboard/help' ||
        path.startsWith('/dashboard/help/') ||
        path === '/dashboard/settings' ||
        path.startsWith('/dashboard/settings/') ||
        path === '/dashboard/events' ||
        path.startsWith('/dashboard/events/') ||
        path === '/dashboard/books' ||
        path.startsWith('/dashboard/books/') ||
        path === '/dashboard/messages' ||
        path.startsWith('/dashboard/messages/') ||
        path === '/dashboard/sanctuary'
    ) {
        return true;
    }

    // 4. Role-specific boundaries
    switch (normalizedRole) {
        case 'STUDENT': {
            // Students can access student portal, assignments, student report views, and timetable
            if (path === '/dashboard/student' || path.startsWith('/dashboard/student/')) return true;
            if (path === '/dashboard/assignments' || path.startsWith('/dashboard/assignments/')) return true;
            if (path === '/dashboard/reports' || path.startsWith('/dashboard/reports/')) return true;
            if (path === '/dashboard/timetable') return true;
            return false;
        }

        case 'PARENT': {
            // Parents can access family portal, authorizations, assignments, reports, and personal tuition view
            if (path.startsWith('/dashboard/parent')) return true;
            if (path === '/dashboard/finance') return true; // View and pay tuition invoices
            if (path === '/dashboard/reports' || path.startsWith('/dashboard/reports/')) return true;
            if (path === '/dashboard/assignments' || path.startsWith('/dashboard/assignments/')) return true;
            return false;
        }

        case 'TEACHER':
        case 'HOMEROOM': {
            // Faculty can access attendance, exam creation, marklists, classes, students, parents, schedules
            if (path === '/dashboard/attendance' || path.startsWith('/dashboard/attendance/')) return true;
            if (path.startsWith('/dashboard/teacher')) return true;
            if (path.startsWith('/dashboard/marklist')) return true;
            if (path.startsWith('/dashboard/classes')) return true;
            if (path.startsWith('/dashboard/students')) return true;
            if (path.startsWith('/dashboard/parents')) return true;
            if (path.startsWith('/dashboard/timetable')) return true;
            if (path === '/dashboard/assignments' || path.startsWith('/dashboard/assignments/')) return true;
            if (path === '/dashboard/reports' || path.startsWith('/dashboard/reports/')) return true;
            if (path === '/dashboard/sanctuary/moderation') return true;
            if (path.startsWith('/dashboard/homeroom') && normalizedRole === 'HOMEROOM') return true;
            return false;
        }

        case 'ACCOUNTANT': {
            // Accountants run tuition fees, expenses, revenue, and payroll
            if (path.startsWith('/dashboard/finance')) return true;
            if (path.startsWith('/dashboard/payroll')) return true;
            if (path.startsWith('/dashboard/operating-costs')) return true;
            if (path.startsWith('/dashboard/revenue')) return true;
            return false;
        }

        case 'RECORDER': {
            // Recorders manage official student and class records
            if (path.startsWith('/dashboard/students')) return true;
            if (path.startsWith('/dashboard/classes')) return true;
            if (path.startsWith('/dashboard/parents')) return true;
            return false;
        }

        default:
            return false;
    }
}
