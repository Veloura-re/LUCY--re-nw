import fs from 'fs';
import path from 'path';

jest.mock('@/lib/prisma', () => ({ prisma: { parentStudentLink: { findFirst: jest.fn() } } }));
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => ({}) }));
jest.mock('@/lib/users', () => ({ getCachedUser: jest.fn() }));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

import { ALL_ROLES, FINANCE_ROLES, RECORDS_ROLES, REGISTRY_ROLES } from '@/lib/security';
import { canViewStudent } from '@/lib/student-access';
import { INVITABLE_STAFF_ROLES, isInvitableStaffRole } from '@/lib/staff-roles';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('role groups', () => {
    test('accountants run finance but not records', () => {
        expect(FINANCE_ROLES).toContain('ACCOUNTANT');
        expect(RECORDS_ROLES).not.toContain('ACCOUNTANT');
        expect(REGISTRY_ROLES).not.toContain('ACCOUNTANT');
    });

    test('recorders run records but not finance', () => {
        expect(RECORDS_ROLES).toContain('RECORDER');
        expect(REGISTRY_ROLES).toContain('RECORDER');
        expect(FINANCE_ROLES).not.toContain('RECORDER');
    });

    test('the student registry is for staff only', () => {
        for (const role of ['PARENT', 'STUDENT', 'ACCOUNTANT'] as const) expect(REGISTRY_ROLES).not.toContain(role);
        for (const role of ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM', 'RECORDER'] as const) expect(REGISTRY_ROLES).toContain(role);
    });

    test('both new roles can use shared features such as uploads', () => {
        expect(ALL_ROLES).toEqual(expect.arrayContaining(['ACCOUNTANT', 'RECORDER']));
    });
});

describe('invitable roles', () => {
    test('only accountant and recorder can be invited from the staff page', () => {
        expect([...INVITABLE_STAFF_ROLES]).toEqual(['ACCOUNTANT', 'RECORDER']);
        expect(isInvitableStaffRole('ACCOUNTANT')).toBe(true);
        expect(isInvitableStaffRole('RECORDER')).toBe(true);
        for (const role of ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'PARENT', '', null, undefined]) {
            expect(isInvitableStaffRole(role)).toBe(false);
        }
    });
});

describe('student record access', () => {
    const recorder = { id: 'r1', role: 'RECORDER', schoolId: 'school-a' };
    const student = { id: 's1', schoolId: 'school-a', userId: null };

    test('a recorder sees students of their own school only', async () => {
        await expect(canViewStudent(recorder, student)).resolves.toBe(true);
        await expect(canViewStudent(recorder, { ...student, schoolId: 'school-b' })).resolves.toBe(false);
    });

    test('an accountant never sees student records', async () => {
        await expect(canViewStudent({ id: 'a1', role: 'ACCOUNTANT', schoolId: 'school-a' }, student)).resolves.toBe(false);
    });
});

describe('route boundaries', () => {
    test('platform subscription billing stays with directors', () => {
        for (const file of [
            'app/api/school/billing/checkout/route.ts',
            'app/api/school/billing/chapa-checkout/route.ts',
            'app/api/school/billing/issuing/route.ts',
            'app/api/school/billing/receipt/route.ts',
        ]) {
            expect(read(file)).not.toMatch(/FINANCE_ROLES|ACCOUNTANT/);
        }
    });

    test('recorders cannot delete students', () => {
        const source = read('app/api/school/students/route.ts');
        const del = source.slice(source.indexOf('export async function DELETE'));
        expect(del).toMatch(/requireRole\(\['PRINCIPAL', 'OWNER', 'SUPERADMIN'\]\)/);
        expect(del).not.toMatch(/RECORDS_ROLES/);
    });

    test('the student list is an allow-list, not "anyone but parents and students"', () => {
        const source = read('app/api/school/students/route.ts');
        expect(source).toMatch(/!REGISTRY_ROLES\.includes\(user\.role\)/);
        expect(source).not.toMatch(/user\.role === 'PARENT' \|\| user\.role === 'STUDENT'/);
    });

    test('registry pages check the role, not just that a school is linked', () => {
        for (const file of ['app/dashboard/students/page.tsx', 'app/dashboard/classes/page.tsx']) {
            expect(read(file)).toMatch(/REGISTRY_ROLES\.includes\(dbUser\.role\)/);
        }
    });

    test('the invitation API is limited to directors and scoped to their school', () => {
        const source = read('app/api/school/staff-roles/route.ts');
        expect(source).toMatch(/DIRECTOR_ROLES = \['OWNER', 'PRINCIPAL'\]/);
        expect(source.match(/requireRole\(\[\.\.\.DIRECTOR_ROLES\]\)/g)).toHaveLength(3);
        // Every query filters by the director's school; none takes a school id from the request.
        expect(source).not.toMatch(/searchParams\.get\('schoolId'\)|body\.schoolId/);
    });
});
