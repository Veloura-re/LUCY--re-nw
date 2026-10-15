/**
 * Route-level authorization tests for GET /api/school/students/[studentId]/report-card.
 * Prisma and the session helper are replaced with in-memory doubles so the real route logic runs.
 */
const mockRequireAuth = jest.fn();
const db = {
    users: {} as Record<string, any>,
    students: [] as any[],
    links: [] as any[],
};

const pick = (student: any) => ({ ...student, school: { id: student.schoolId, name: 'School', logoUrl: null, address: null }, grade: null, class: null, parentLinks: [] });

jest.mock('@/lib/security', () => ({
    requireAuth: (...args: any[]) => mockRequireAuth(...args),
    handleApiError: (e: any) => new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 }),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: async ({ where }: any) => db.users[where.id] ?? null,
            findFirst: async () => ({ name: 'Principal', role: 'PRINCIPAL' }),
        },
        student: {
            findUnique: async ({ where }: any) => {
                const s = db.students.find((x) => x.id === where.id);
                return s ? pick(s) : null;
            },
            findFirst: async ({ where }: any) => {
                const matches = db.students.filter((s) => {
                    if (where.schoolId && s.schoolId !== where.schoolId) return false;
                    if (where.userId && s.userId !== where.userId) return false;
                    if (where.id && s.id !== where.id) return false;
                    if (where.OR) {
                        return where.OR.some((c: any) =>
                            (c.id && s.id === c.id) || (c.userId && s.userId === c.userId) ||
                            (c.studentCode && s.studentCode.toLowerCase() === String(c.studentCode.equals).toLowerCase()));
                    }
                    return true;
                });
                return matches[0] ? pick(matches[0]) : null;
            },
        },
        parentStudentLink: {
            findFirst: async ({ where }: any) =>
                db.links.find((l) => l.parentId === where.parentId && (!where.studentId || l.studentId === where.studentId)) ?? null,
        },
        academicTerm: { findFirst: async () => null },
        subject: { findMany: async () => [] },
        marklistConfig: { findMany: async () => [] },
        marklistEntry: { findMany: async () => [] },
        attendanceRecord: { findMany: async () => [] },
        studentRemark: { findMany: async () => [] },
        internalNote: { findMany: async () => [] },
        teacherAssignment: { findFirst: async () => null },
    },
}));

import { GET } from '@/app/api/school/students/[studentId]/report-card/route';
import { signStudentPayload } from '@/lib/student-id-security';

const call = (studentId: string, query = '') =>
    GET(new Request(`http://localhost/api/school/students/${studentId}/report-card${query}`), { params: Promise.resolve({ studentId }) });

beforeEach(() => {
    mockRequireAuth.mockReset();
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));
    db.users = {
        'principal-a': { id: 'principal-a', role: 'PRINCIPAL', schoolId: 'school-a' },
        'principal-b': { id: 'principal-b', role: 'PRINCIPAL', schoolId: 'school-b' },
        'parent-1': { id: 'parent-1', role: 'PARENT', schoolId: 'school-a' },
        'parent-2': { id: 'parent-2', role: 'PARENT', schoolId: 'school-a' },
        'student-user-a': { id: 'student-user-a', role: 'STUDENT', schoolId: 'school-a' },
        'student-user-other': { id: 'student-user-other', role: 'STUDENT', schoolId: 'school-a' },
    };
    db.students = [
        { id: 'stu-a', schoolId: 'school-a', userId: 'student-user-a', studentCode: 'A-001', firstName: 'Ada', lastName: 'A', classId: null, guardianPhone: '+251911', guardianName: 'G' },
        { id: 'stu-a2', schoolId: 'school-a', userId: 'student-user-other', studentCode: 'A-002', firstName: 'Bo', lastName: 'B', classId: null },
    ];
    db.links = [{ parentId: 'parent-1', studentId: 'stu-a' }];
});

const asUser = (id: string) => mockRequireAuth.mockResolvedValue({ id });

describe('anonymous access', () => {
    it('rejects a request with no signature', async () => {
        expect((await call('stu-a')).status).toBe(404);
    });

    it('rejects a forged signature and a signature for another school', async () => {
        expect((await call('stu-a', '?sid=school-a&sig=0000000000000000')).status).toBe(404);
        const sigForOtherSchool = signStudentPayload('stu-a', 'school-b');
        expect((await call('stu-a', `?sid=school-b&sig=${sigForOtherSchool}`)).status).toBe(404);
    });

    it('does not resolve a student by code or user id', async () => {
        expect((await call('A-001', '?sid=school-a&sig=' + signStudentPayload('A-001', 'school-a'))).status).toBe(404);
    });

    it('returns only the minimal public payload for a valid signed credential', async () => {
        const res = await call('stu-a', `?sid=school-a&sig=${signStudentPayload('stu-a', 'school-a')}`);
        expect(res.status).toBe(200);
        const body: any = await res.json();
        expect(body.userRole).toBe('GUEST');
        expect(body.student.firstName).toBe('Ada');
        expect(body.student).not.toHaveProperty('guardianPhone');
        expect(body.student).not.toHaveProperty('guardianName');
        expect(body.student).not.toHaveProperty('address');
        expect(body).not.toHaveProperty('grades');
        expect(body).not.toHaveProperty('internalNotes');
    });
});

describe('authenticated access', () => {
    it('lets staff of the same school view the student', async () => {
        asUser('principal-a');
        expect((await call('stu-a')).status).toBe(200);
    });

    it('hides the student from staff of another school (by id and by code)', async () => {
        asUser('principal-b');
        expect((await call('stu-a')).status).toBe(404);
        expect((await call('A-001')).status).toBe(404);
    });

    it('does not fall back to the first student of the caller school for an unknown id', async () => {
        asUser('principal-a');
        expect((await call('does-not-exist')).status).toBe(404);
    });

    it('lets a parent see only a linked child', async () => {
        asUser('parent-1');
        expect((await call('stu-a')).status).toBe(200);
        expect((await call('stu-a2')).status).toBe(404);
        asUser('parent-2');
        expect((await call('stu-a')).status).toBe(404);
    });

    it('lets a student see only themselves', async () => {
        asUser('student-user-a');
        expect((await call('stu-a')).status).toBe(200);
        expect((await call('stu-a2')).status).toBe(404);
        expect((await call('me')).status).toBe(200);
    });

    it('does not expose staff-only fields to a parent', async () => {
        asUser('parent-1');
        const body: any = await (await call('stu-a')).json();
        expect(body.internalNotes).toEqual([]);
        expect(body.canEditRemarks).toBe(false);
    });
});
