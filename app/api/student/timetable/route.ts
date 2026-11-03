import { getVerifiedUser, handleApiError, clientDataError } from '@/lib/security';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const authUser = await getVerifiedUser();
        if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get student record for classId
        const student = await (prisma as any).student.findUnique({
            where: { userId: authUser.id },
            select: { classId: true }
        });

        if (!student || !student.classId) {
            return NextResponse.json({ error: "No class assigned" }, { status: 404 });
        }

        // Fetch Timetable with relations
        const timetable = await (prisma as any).timetable.findMany({
            where: { classId: student.classId },
            include: {
                period: true,
                subject: true,
                teacher: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { period: { order: 'asc' } }
            ]
        });

        // Group by day for easier frontend consumption
        const grouped = timetable.reduce((acc: any, entry: any) => {
            const day = entry.dayOfWeek;
            if (!acc[day]) acc[day] = [];
            acc[day].push({
                id: entry.id,
                subject: entry.subject.name,
                teacher: entry.teacher.name,
                startTime: entry.period.startTime,
                endTime: entry.period.endTime,
                room: entry.period.name, // Using period name as room/label if room id not on timetable
                isBreak: entry.period.isBreak
            });
            return acc;
        }, {});

        return NextResponse.json(grouped);
    } catch (error) {
        { const bad = clientDataError(error); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((error as any)?.message))) return handleApiError(error);
        console.error("Timetable Fetch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
