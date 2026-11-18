import { NextRequest } from 'next/server';

const mockRequireRole = jest.fn();
const mockLogActivity = jest.fn();
const mockRevalidateTag = jest.fn();

const db = {
    schools: [
        {
            id: 'school-1',
            name: 'Apex Academy',
            schoolCode: 'APEX',
            domain: null as string | null,
            termStructureLocked: false,
        },
        {
            id: 'school-2',
            name: 'Oxford International',
            schoolCode: 'OXFORD',
            domain: 'oxford',
            termStructureLocked: false,
        },
    ] as any[],
};

jest.mock('@/lib/security', () => ({
    requireRole: (...args: any[]) => mockRequireRole(...args),
    handleApiError: (e: any) => new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 }),
}));

jest.mock('@/lib/audit', () => ({
    logActivity: (...args: any[]) => mockLogActivity(...args),
    getIp: () => '127.0.0.1',
}));

jest.mock('next/cache', () => ({
    revalidateTag: (...args: any[]) => mockRevalidateTag(...args),
}));

jest.mock('@/lib/prisma', () => ({
    prisma: {
        school: {
            findUnique: async ({ where }: any) => {
                return db.schools.find((s) => s.id === where.id) || null;
            },
            findFirst: async ({ where }: any) => {
                return db.schools.find((s) => {
                    if (where.id?.not && s.id === where.id.not) return false;
                    if (where.domain?.equals) {
                        return s.domain && s.domain.toLowerCase() === where.domain.equals.toLowerCase();
                    }
                    return true;
                }) || null;
            },
            update: async ({ where, data }: any) => {
                const target = db.schools.find((s) => s.id === where.id);
                if (!target) throw new Error('Not found');
                Object.assign(target, data);
                return target;
            },
        },
    },
}));

// Import the PATCH handler after mocks are registered
import { PATCH } from '../app/api/school/settings/route';

describe('School Tenant Subdomain Settings (PATCH /api/school/settings)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default authorized caller as PRINCIPAL of school-1
        mockRequireRole.mockResolvedValue({
            id: 'user-principal-1',
            schoolId: 'school-1',
            role: 'PRINCIPAL',
        });
        // Reset school-1 domain
        db.schools[0].domain = null;
    });

    it('enables a valid custom subdomain for the institution', async () => {
        const req = new NextRequest('http://localhost/api/school/settings', {
            method: 'PATCH',
            body: JSON.stringify({
                domain: 'apex',
            }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(200);

        const data = await res.json() as any;
        expect(data.school.domain).toBe('apex');
        expect(db.schools[0].domain).toBe('apex');
    });

    it('disables/clears custom subdomain when passed empty string or null', async () => {
        db.schools[0].domain = 'apex';

        const req = new NextRequest('http://localhost/api/school/settings', {
            method: 'PATCH',
            body: JSON.stringify({
                domain: '',
            }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(200);

        const data = await res.json() as any;
        expect(data.school.domain).toBeNull();
        expect(db.schools[0].domain).toBeNull();
    });

    it('rejects invalid subdomain formatting (hyphen prefix, special chars, uppercase)', async () => {
        const invalidSubdomains = ['-leading', 'has space', 'under_score', 'special!char'];

        for (const sub of invalidSubdomains) {
            const req = new NextRequest('http://localhost/api/school/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    domain: sub,
                }),
            });

            const res = await PATCH(req);
            expect(res.status).toBe(400);
            const data = await res.json() as any;
            expect(data.error).toContain('Invalid subdomain format');
        }
    });

    it('rejects reserved platform and administrative subdomains', async () => {
        const reservedList = ['4xctrl', 'st4g3', 'admin', 'api', 'portal', 'app', 'staging'];

        for (const sub of reservedList) {
            const req = new NextRequest('http://localhost/api/school/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    domain: sub,
                }),
            });

            const res = await PATCH(req);
            expect(res.status).toBe(400);
            const data = await res.json() as any;
            expect(data.error).toContain('reserved by the platform');
        }
    });

    it('returns 409 Conflict if another school already claimed the subdomain', async () => {
        // school-2 already has domain 'oxford'
        const req = new NextRequest('http://localhost/api/school/settings', {
            method: 'PATCH',
            body: JSON.stringify({
                domain: 'oxford',
            }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(409);
        const data = await res.json() as any;
        expect(data.error).toContain('already claimed by another institution');
    });

    it('allows a school to re-save its own currently assigned subdomain without conflict', async () => {
        db.schools[0].domain = 'apex';

        const req = new NextRequest('http://localhost/api/school/settings', {
            method: 'PATCH',
            body: JSON.stringify({
                domain: 'apex',
                name: 'Apex Academy Updated',
            }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.school.domain).toBe('apex');
    });
});
