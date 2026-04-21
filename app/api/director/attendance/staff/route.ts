import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { searchParams } = new URL(request.url);
        const dateQuery = searchParams.get('date');
        const targetDate = dateQuery ? new Date(dateQuery) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const teachers = await (prisma.user as any).findMany({
            where: {
                schoolId: dbUser.schoolId!,
                role: { in: ['TEACHER', 'HOMEROOM'] }
            },
            select: {
                id: true,
                name: true,
                staffAttendance: {
                    where: {
                        date: {
                            gte: targetDate,
                            lt: nextDay
                        }
                    }
                },
                absenceAuthorizations: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: targetDate },
                        endDate: { gte: targetDate }
                    }
                }
            }
        });

        const records = teachers.map((teacher: any) => {
            const att = teacher.staffAttendance[0];
            const leave = teacher.absenceAuthorizations[0];

            let status = 'PENDING';
            let reason = null;

            if (att) {
                status = att.status;
                reason = att.reason;
            } else if (leave) {
                status = 'EXCUSED';
                reason = `Approved Leave: ${leave.reason}`;
            }

            return {
                teacherId: teacher.id,
                name: teacher.name,
                status,
                reason,
            };
        });

        return NextResponse.json({ records });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const authUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);
        const body = await request.json();
        const { date, records } = body;

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        await prisma.$transaction(async (tx) => {
            for (const record of records) {
                // Tenant integration check: does this teacher belong to the current school?
                const targetTeacher = await tx.user.findUnique({
                    where: { id: record.teacherId },
                    select: { schoolId: true }
                });

                if (!targetTeacher || targetTeacher.schoolId !== authUser.schoolId) {
                    continue; // Skip or throw error? Skip invalid/unauthorized matches.
                }

                if (record.status === 'PENDING') {
                    // Try delete if it existed before and is now un-marked
                    await tx.staffAttendanceRecord.deleteMany({
                        where: {
                            userId: record.teacherId,
                            date: targetDate
                        }
                    });
                } else {
                    await tx.staffAttendanceRecord.upsert({
                        where: {
                            userId_date: {
                                userId: record.teacherId,
                                date: targetDate
                            }
                        },
                        update: {
                            status: record.status,
                            reason: record.reason || null
                        },
                        create: {
                            userId: record.teacherId,
                            date: targetDate,
                            status: record.status,
                            reason: record.reason || null,
                            createdById: authUser.id
                        }
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
