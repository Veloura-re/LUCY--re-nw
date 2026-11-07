import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError, secureRandomInt } from '@/lib/security';
import { DayOfWeek } from '@prisma/client';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { overwrite = false, includeWeekends = false } = (await request.json()) as any;

        // 1. Fetch all assignments, periods, and existing timetables
        const assignments = await prisma.teacherAssignment.findMany({
            where: { class: { grade: { schoolId: dbUser.schoolId } } }
        });

        const periods = await prisma.period.findMany({
            where: { schoolId: dbUser.schoolId, isBreak: false }
        });

        if (periods.length === 0) {
            return NextResponse.json({ error: "No periods defined for this school." }, { status: 400 });
        }

        const existingTimetables = overwrite ? [] : await prisma.timetable.findMany({
            where: { class: { grade: { schoolId: dbUser.schoolId } } }
        });

        const daysToUse: DayOfWeek[] = includeWeekends 
            ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] 
            : ['MON', 'TUE', 'WED', 'THU', 'FRI'];

        // In-memory tracking to prevent double booking
        // Key: classId_day_periodId
        const classBooked = new Set<string>();
        // Key: teacherId_day_periodId
        const teacherBooked = new Set<string>();

        // Pre-fill existing records
        for (const t of existingTimetables) {
            classBooked.add(`${t.classId}_${t.dayOfWeek}_${t.periodId}`);
            teacherBooked.add(`${t.teacherId}_${t.dayOfWeek}_${t.periodId}`);
        }

        const newTimetableEntries: any[] = [];
        let unassignedCount = 0;

        // Fisher-Yates shuffle with secure RNG
        const shuffle = (array: any[]) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = secureRandomInt(0, i);
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        // Sort assignments by periodsPerWeek descending to schedule the hardest ones first
        const sortedAssignments = [...assignments].sort((a: any, b: any) => b.periodsPerWeek - a.periodsPerWeek);

        for (const assignment of sortedAssignments as any[]) {
            let scheduledCount = 0;

            // Find how many periods are already scheduled for this assignment
            if (!overwrite) {
                const existingCount = existingTimetables.filter(t => 
                    t.classId === assignment.classId && 
                    t.subjectId === assignment.subjectId && 
                    t.teacherId === assignment.teacherId
                ).length;
                scheduledCount = existingCount;
            }

            const targetPeriods = assignment.periodsPerWeek;
            
            // Attempt to schedule remaining periods
            let loopGuard = 0;
            while (scheduledCount < targetPeriods && loopGuard < 1000) {
                loopGuard++;
                
                // Shuffle days and periods to get an organic distribution
                const randomizedDays = shuffle([...daysToUse]);
                const randomizedPeriods = shuffle([...periods]);
                
                let assignedThisLoop = false;

                for (const day of randomizedDays) {
                    if (assignedThisLoop) break;
                    
                    for (const period of randomizedPeriods) {
                        const classKey = `${assignment.classId}_${day}_${period.id}`;
                        const teacherKey = `${assignment.teacherId}_${day}_${period.id}`;

                        if (!classBooked.has(classKey) && !teacherBooked.has(teacherKey)) {
                            // Slot is available for both class and teacher!
                            classBooked.add(classKey);
                            teacherBooked.add(teacherKey);
                            
                            newTimetableEntries.push({
                                classId: assignment.classId,
                                subjectId: assignment.subjectId,
                                teacherId: assignment.teacherId,
                                periodId: period.id,
                                dayOfWeek: day
                            });
                            
                            scheduledCount++;
                            assignedThisLoop = true;
                            break;
                        }
                    }
                }

                if (!assignedThisLoop) {
                    // No available slot found for this iteration (mathematically impossible with current grid)
                    unassignedCount += (targetPeriods - scheduledCount);
                    break;
                }
            }
        }

        // 3. Save to database atomically within a transaction
        await prisma.$transaction(async (tx) => {
            if (overwrite) {
                await tx.timetable.deleteMany({
                    where: { class: { grade: { schoolId: dbUser.schoolId } } }
                });
            }
            if (newTimetableEntries.length > 0) {
                await tx.timetable.createMany({
                    data: newTimetableEntries
                });
            }
        });

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({
                userId: dbUser.id,
                schoolId: dbUser.schoolId,
                action: 'AUTO_GENERATE_TIMETABLE',
                resourceType: 'timetable',
                ip: _ip || undefined,
                after: { generatedCount: newTimetableEntries.length, unassignedCount }
            });
        } catch { /* non-blocking */ }
return NextResponse.json({ 
            success: true, 
            generatedCount: newTimetableEntries.length,
            unassignedCount,
            message: unassignedCount > 0 
                ? `Generated ${newTimetableEntries.length} slots. Warning: ${unassignedCount} slots could not be scheduled due to lack of available periods or teacher conflicts.`
                : `Successfully auto-generated ${newTimetableEntries.length} slots.`
        });
    } catch (e) {
        return handleApiError(e);
    }
}
