const mockFindUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockCreateMany = jest.fn();
const mockLogActivity = jest.fn();

jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: (...a: any[]) => mockFindUser(...a), update: (...a: any[]) => mockUpdateUser(...a) },
        consentRecord: { createMany: (...a: any[]) => mockCreateMany(...a) },
    },
}));
jest.mock('@/lib/audit', () => ({
    getIp: () => '10.0.0.1',
    logActivity: (...a: any[]) => mockLogActivity(...a),
}));

import { recordConsent, storeConsent } from '@/lib/consent';
import { LEGAL_VERSION } from '@/lib/legal-versions';

const request = new Request('https://example.com', { headers: { 'user-agent': 'jest-agent' } });

beforeEach(() => jest.clearAllMocks());

test('stores a record per document and marks the user as current', async () => {
    mockFindUser.mockResolvedValue({ legalVersionAccepted: null });
    mockCreateMany.mockResolvedValue({ count: 2 });

    await expect(recordConsent({ userId: 'u1', source: 'login', request })).resolves.toEqual({ recorded: true });

    const { data, skipDuplicates } = mockCreateMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data.map((row: any) => row.documentType)).toEqual(['TERMS', 'PRIVACY']);
    expect(data[0]).toMatchObject({ userId: 'u1', version: LEGAL_VERSION, source: 'login', ip: '10.0.0.1', userAgent: 'jest-agent' });
    expect(mockUpdateUser).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { legalVersionAccepted: LEGAL_VERSION } });
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
});

test('does nothing when the user already accepted this version', async () => {
    mockFindUser.mockResolvedValue({ legalVersionAccepted: LEGAL_VERSION });

    await expect(recordConsent({ userId: 'u1', source: 'login', request })).resolves.toEqual({ recorded: false });
    expect(mockCreateMany).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
});

test('a new legal version asks a previously accepted user again', async () => {
    mockFindUser.mockResolvedValue({ legalVersionAccepted: '2020-01-01' });
    mockCreateMany.mockResolvedValue({ count: 2 });
    await expect(recordConsent({ userId: 'u1', source: 'accept-terms' })).resolves.toEqual({ recorded: true });
});

test('storeConsent works against a transaction client and writes no audit entry', async () => {
    mockFindUser.mockResolvedValue(null);
    mockCreateMany.mockResolvedValue({ count: 2 });
    const tx = {
        user: { findUnique: mockFindUser, update: mockUpdateUser },
        consentRecord: { createMany: mockCreateMany },
    };

    await expect(storeConsent(tx as any, { userId: 'p1', source: 'register-parent' })).resolves.toBe(true);
    expect(mockLogActivity).not.toHaveBeenCalled();
});
