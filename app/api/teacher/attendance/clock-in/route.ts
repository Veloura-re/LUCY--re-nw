import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + 1);

        const record = await prisma.staffAttendanceRecord.findFirst({
            where: {
                userId: dbUser.id,
                date: {
                    gte: today,
                    lt: nextDay
                }
            }
        });

        return NextResponse.json({
            clockedIn: !!record,
            record
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newRecord = await prisma.$transaction(async (tx) => {
            return await tx.staffAttendanceRecord.upsert({
                where: {
                    userId_date: {
                        userId: dbUser.id,
                        date: today
                    }
                },
                update: {
                    status: 'PRESENT'
                },
                create: {
                    userId: dbUser.id,
                    date: today,
                    status: 'PRESENT',
                    reason: 'Self-Reported (Clock-In)',
                    createdById: dbUser.id
                }
            });
        });

        
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CLOCK_IN', resourceType: 'attendance', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, record: newRecord });
    } catch (e) {
        return handleApiError(e);
    }
}
