import { isSchoolRoleAllowedForPath } from '../lib/school-rbac';

describe('School RBAC Boundary Matrix (lucyos.5-cn.net)', () => {
    describe('Student role route clearance', () => {
        const permitted = [
            '/dashboard/student',
            '/dashboard/student/profile',
            '/dashboard/student/exams',
            '/dashboard/student/grades',
            '/dashboard/student/timetable',
            '/dashboard/student/assignments',
            '/dashboard/assignments',
            '/dashboard/reports',
            '/dashboard/timetable',
            '/dashboard/events',
            '/dashboard/books',
            '/dashboard/messages',
            '/dashboard/sanctuary',
            '/dashboard/settings',
            '/dashboard/help',
        ];

        const blocked = [
            '/dashboard/finance',
            '/dashboard/finance/payroll',
            '/dashboard/billing',
            '/dashboard/payroll',
            '/dashboard/operating-costs',
            '/dashboard/revenue',
            '/dashboard/teachers',
            '/dashboard/principals',
            '/dashboard/staff-roles',
            '/dashboard/attendance',
            '/dashboard/attendance/settings',
            '/dashboard/teacher/exams',
            '/dashboard/teacher/attendance',
            '/dashboard/parent',
            '/dashboard/parent/authorizations',
            '/dashboard/classes',
            '/dashboard/students',
            '/dashboard/settings/data',
            '/dashboard/approvals',
            '/dashboard/director/marklist',
        ];

        for (const p of permitted) {
            test(`permits scholar to access ${p}`, () => {
                expect(isSchoolRoleAllowedForPath('STUDENT', p)).toBe(true);
            });
        }

        for (const b of blocked) {
            test(`blocks scholar from accessing ${b}`, () => {
                expect(isSchoolRoleAllowedForPath('STUDENT', b)).toBe(false);
            });
        }
    });

    describe('Parent role route clearance', () => {
        const permitted = [
            '/dashboard/parent',
            '/dashboard/parent/authorizations',
            '/dashboard/parent/homework',
            '/dashboard/finance', // Allows viewing and settling tuition invoices
            '/dashboard/reports',
            '/dashboard/assignments',
            '/dashboard/events',
            '/dashboard/books',
            '/dashboard/messages',
            '/dashboard/settings',
            '/dashboard/help',
        ];

        const blocked = [
            '/dashboard/finance/payroll',
            '/dashboard/billing',
            '/dashboard/payroll',
            '/dashboard/operating-costs',
            '/dashboard/revenue',
            '/dashboard/teacher/attendance',
            '/dashboard/teacher/exams',
            '/dashboard/attendance',
            '/dashboard/student/profile',
            '/dashboard/principals',
            '/dashboard/staff-roles',
            '/dashboard/classes',
            '/dashboard/teachers',
            '/dashboard/settings/data',
            '/dashboard/approvals',
            '/dashboard/director/attendance',
        ];

        for (const p of permitted) {
            test(`permits parent to access ${p}`, () => {
                expect(isSchoolRoleAllowedForPath('PARENT', p)).toBe(true);
            });
        }

        for (const b of blocked) {
            test(`blocks parent from accessing ${b}`, () => {
                expect(isSchoolRoleAllowedForPath('PARENT', b)).toBe(false);
            });
        }
    });

    describe('Faculty (Teacher & Homeroom) route clearance', () => {
        const permitted = [
            '/dashboard/attendance',
            '/dashboard/teacher/attendance',
            '/dashboard/teacher/exams',
            '/dashboard/teacher/lessons',
            '/dashboard/teacher/schedule',
            '/dashboard/marklist',
            '/dashboard/classes',
            '/dashboard/students',
            '/dashboard/parents',
            '/dashboard/timetable',
            '/dashboard/assignments',
            '/dashboard/reports',
            '/dashboard/events',
            '/dashboard/books',
            '/dashboard/messages',
        ];

        const blocked = [
            '/dashboard/billing',
            '/dashboard/principals',
            '/dashboard/staff-roles',
            '/dashboard/settings/data',
            '/dashboard/approvals',
            '/dashboard/student/profile',
            '/dashboard/parent/authorizations',
        ];

        for (const p of permitted) {
            test(`permits teacher to access ${p}`, () => {
                expect(isSchoolRoleAllowedForPath('TEACHER', p)).toBe(true);
            });
        }

        for (const b of blocked) {
            test(`blocks teacher from accessing ${b}`, () => {
                expect(isSchoolRoleAllowedForPath('TEACHER', b)).toBe(false);
            });
        }
    });

    describe('Accountant role route clearance', () => {
        test('permits accountant to access financial domains', () => {
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/finance')).toBe(true);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/payroll')).toBe(true);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/operating-costs')).toBe(true);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/revenue')).toBe(true);
        });

        test('blocks accountant from non-financial domains', () => {
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/billing')).toBe(false);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/principals')).toBe(false);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/staff-roles')).toBe(false);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/teacher/exams')).toBe(false);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/student')).toBe(false);
            expect(isSchoolRoleAllowedForPath('ACCOUNTANT', '/dashboard/parent')).toBe(false);
        });
    });

    describe('Recorder role route clearance', () => {
        test('permits recorder to access student and registry records', () => {
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/students')).toBe(true);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/classes')).toBe(true);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/parents')).toBe(true);
        });

        test('blocks recorder from finance and leadership administration', () => {
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/finance')).toBe(false);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/payroll')).toBe(false);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/billing')).toBe(false);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/principals')).toBe(false);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/student')).toBe(false);
            expect(isSchoolRoleAllowedForPath('RECORDER', '/dashboard/parent')).toBe(false);
        });
    });

    describe('Owner & Principal leadership route clearance', () => {
        test('permits owner to access all institutional routes including principal management', () => {
            expect(isSchoolRoleAllowedForPath('OWNER', '/dashboard/principals')).toBe(true);
            expect(isSchoolRoleAllowedForPath('OWNER', '/dashboard/billing')).toBe(true);
            expect(isSchoolRoleAllowedForPath('OWNER', '/dashboard/finance')).toBe(true);
            expect(isSchoolRoleAllowedForPath('OWNER', '/dashboard/approvals')).toBe(true);
        });

        test('blocks principal from principal management route reserved for owner', () => {
            expect(isSchoolRoleAllowedForPath('PRINCIPAL', '/dashboard/principals')).toBe(false);
            expect(isSchoolRoleAllowedForPath('PRINCIPAL', '/dashboard/billing')).toBe(true);
            expect(isSchoolRoleAllowedForPath('PRINCIPAL', '/dashboard/finance')).toBe(true);
        });
    });
});
