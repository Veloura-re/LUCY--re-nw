import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { AttendanceStatus } from '@prisma/client';

import { logActivity } from '@/lib/audit';
export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

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
        const authUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const body = (await request.json()) as { date: string; records: Array<{ teacherId: string; status: string; reason?: string }> };
        const { date, records } = body;

        if (!date || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: 'date and records are required' }, { status: 400 });
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Crystal Ball: prefetch ALL teacher IDs in ONE query — eliminates N+1 inside transaction
        const teacherIds = records.map(r => r.teacherId);
        const validTeachers = await prisma.user.findMany({
            where: {
                id: { in: teacherIds },
                schoolId: authUser.schoolId,   // Tenant isolation
            },
            select: { id: true }
        });
        const validTeacherIdSet = new Set(validTeachers.map(t => t.id));

        // Necromancy: track skipped records so the caller knows what failed
        const skippedIds: string[] = [];
        const validRecords = records.filter(record => {
            if (!validTeacherIdSet.has(record.teacherId)) {
                skippedIds.push(record.teacherId);
                return false;
            }
            return true;
        });

        if (validRecords.length > 0) {
            await prisma.$transaction(async (tx) => {
                for (const record of validRecords) {
                    if (record.status === 'PENDING') {
                        await tx.staffAttendanceRecord.deleteMany({
                            where: { userId: record.teacherId, date: targetDate }
                        });
                    } else {
                        await tx.staffAttendanceRecord.upsert({
                            where: { userId_date: { userId: record.teacherId, date: targetDate } },
                            update: { status: record.status as AttendanceStatus, reason: record.reason || null },
                            create: {
                                userId: record.teacherId,
                                date: targetDate,
                                status: record.status as AttendanceStatus,
                                reason: record.reason || null,
                                createdById: authUser.id
                            }
                        });
                    }
                }
            });
        }

        // Non-blocking audit
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: authUser.id, action: 'BULK_ATTENDANCE', resourceType: 'attendance', ip: _ip });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            saved: validRecords.length,
            // Surface skipped IDs so the UI can warn the admin
            skipped: skippedIds.length > 0 ? skippedIds : undefined
        });
    } catch (e) {
        return handleApiError(e);
    }
}

