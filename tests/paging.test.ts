jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/utils/supabase/server', () => ({ createClient: async () => ({}) }));
jest.mock('@/lib/users', () => ({ getCachedUser: jest.fn() }));
jest.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));

import { clampLimit, clampPage, clientDataError } from '@/lib/security';

test('a page size can never ask for the whole table', () => {
    expect(clampLimit('1000000000')).toBe(200);
    expect(clampLimit('25')).toBe(25);
    expect(clampLimit('-5')).toBe(50);
    expect(clampLimit('0', 12)).toBe(12);
    expect(clampLimit('abc')).toBe(50);
    expect(clampLimit(null, 20)).toBe(20);
});

test('a page number is a positive integer', () => {
    expect(clampPage('3')).toBe(3);
    expect(clampPage('-1')).toBe(1);
    expect(clampPage('NaN')).toBe(1);
    expect(clampPage(undefined)).toBe(1);
    expect(clampPage('99999999999')).toBe(100000);
});

test('input the database rejects is answered with 4xx, anything else is left alone', async () => {
    const make = (name: string, code?: string) => Object.assign(new Error('x'), { name, code });
    expect(clientDataError(make('PrismaClientValidationError'))?.status).toBe(400);
    expect(clientDataError(make('PrismaClientKnownRequestError', 'P2025'))?.status).toBe(404);
    expect(clientDataError(make('PrismaClientKnownRequestError', 'P2002'))?.status).toBe(409);
    expect(clientDataError(make('PrismaClientKnownRequestError', 'P2003'))?.status).toBe(400);
    expect(clientDataError(make('PrismaClientKnownRequestError', 'P2010'))).toBeNull();
    expect(clientDataError(new Error('boom'))).toBeNull();
});
