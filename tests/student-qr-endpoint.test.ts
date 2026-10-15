const mockRequireRole = jest.fn();
const students: any[] = [{ id: 'stu-a', schoolId: 'school-a', userId: 'stu-user', studentCode: 'A-001' }];
const links: any[] = [{ parentId: 'parent-1', studentId: 'stu-a' }];

jest.mock('@/lib/security', () => ({
    requireRole: (...args: any[]) => mockRequireRole(...args),
    ALL_ROLES: ['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT'],
    handleApiError: (e: any) => new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 401 }),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        student: { findUnique: async ({ where }: any) => students.find((s) => s.id === where.id) ?? null },
        parentStudentLink: {
            findFirst: async ({ where }: any) => links.find((l) => l.parentId === where.parentId && l.studentId === where.studentId) ?? null,
        },
    },
}));

import { GET } from '@/app/api/school/students/[studentId]/qr/route';
import { verifyStudentSignature } from '@/lib/student-id-security';

const call = (id: string) => GET(new Request('http://localhost/x'), { params: Promise.resolve({ studentId: id }) });
const as = (user: any) => mockRequireRole.mockResolvedValue(user);

describe('GET /api/school/students/[studentId]/qr', () => {
    it('rejects an unauthenticated caller', async () => {
        mockRequireRole.mockRejectedValue(new Error('Unauthorized'));
        expect((await call('stu-a')).status).toBe(401);
    });

    it('issues a verifiable signature to staff of the same school', async () => {
        as({ id: 'p', role: 'PRINCIPAL', schoolId: 'school-a' });
        const res = await call('stu-a');
        expect(res.status).toBe(200);
        const body: any = await res.json();
        expect(body.sid).toBe('school-a');
        expect(verifyStudentSignature('stu-a', 'school-a', body.sig)).toBe(true);
    });

    it('refuses staff of another school, unlinked parents and other students', async () => {
        as({ id: 'p', role: 'PRINCIPAL', schoolId: 'school-b' });
        expect((await call('stu-a')).status).toBe(404);
        as({ id: 'parent-2', role: 'PARENT', schoolId: 'school-a' });
        expect((await call('stu-a')).status).toBe(404);
        as({ id: 'someone-else', role: 'STUDENT', schoolId: 'school-a' });
        expect((await call('stu-a')).status).toBe(404);
    });

    it('allows a linked parent and the student themselves', async () => {
        as({ id: 'parent-1', role: 'PARENT', schoolId: 'school-a' });
        expect((await call('stu-a')).status).toBe(200);
        as({ id: 'stu-user', role: 'STUDENT', schoolId: 'school-a' });
        expect((await call('stu-a')).status).toBe(200);
    });
});
