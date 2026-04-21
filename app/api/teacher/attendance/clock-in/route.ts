import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

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

        return NextResponse.json({ success: true, record: newRecord });
    } catch (e) {
        return handleApiError(e);
    }
}
