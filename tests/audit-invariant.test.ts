import fs from 'fs';
import path from 'path';

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
        auditLog: { create: (...args: any[]) => mockCreate(...args) },
    },
}));

import { logActivity } from '@/lib/audit';

describe('logActivity schoolId invariant', () => {
    beforeEach(() => {
        mockFindUnique.mockReset();
        mockCreate.mockReset();
        mockCreate.mockResolvedValue({});
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('keeps an explicit schoolId', async () => {
        await logActivity({ userId: 'u1', schoolId: 's1', action: 'X', resourceType: 'r' });
        expect(mockCreate.mock.calls[0][0].data.schoolId).toBe('s1');
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it('resolves the schoolId from the acting user when the caller omits it', async () => {
        mockFindUnique.mockResolvedValue({ schoolId: 's9' });
        await logActivity({ userId: 'u1', action: 'X', resourceType: 'r' });
        expect(mockCreate.mock.calls[0][0].data.schoolId).toBe('s9');
    });

    it('warns when no school can be determined', async () => {
        mockFindUnique.mockResolvedValue({ schoolId: null });
        await logActivity({ userId: 'u1', action: 'X', resourceType: 'r' });
        expect(console.warn).toHaveBeenCalled();
    });

    it('never throws when persistence fails', async () => {
        mockCreate.mockRejectedValue(new Error('db down'));
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        await expect(logActivity({ userId: 'u1', schoolId: 's1', action: 'X', resourceType: 'r' })).resolves.toBeUndefined();
    });
});

describe('direct auditLog.create calls', () => {
    const ROOT = path.resolve(__dirname, '..');

    function walk(dir: string, out: string[] = []): string[] {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (['node_modules', '.next', '.open-next', 'tests'].includes(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full, out);
            else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
        }
        return out;
    }

    it('always set schoolId in the data object (except the central logActivity helper)', () => {
        const offenders: string[] = [];
        for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))]) {
            const rel = path.relative(ROOT, file);
            if (rel === 'lib/audit.ts') continue;
            const src = fs.readFileSync(file, 'utf8');
            const re = /auditLog\.create\(\s*\{\s*data:\s*\{([\s\S]*?)\}\s*(?:as any)?\s*\}\s*\)/g;
            let match: RegExpExecArray | null;
            while ((match = re.exec(src))) {
                if (!/schoolId/.test(match[1])) offenders.push(rel);
            }
        }
        expect(offenders).toEqual([]);
    });
});
