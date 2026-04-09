import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL']);

        // Use the centralized, cached utility to ensure logic parity with SSR
        const data = await getTeacherDashboardData(dbUser.id);

        // Map the structured summary back to the flat format expected by this specific legacy endpoint
        const attendanceRate = data.attendanceSummary.find(s => s.label === "Attendance Rate")?.value || "100%";
        const missingCount = parseInt(data.attendanceSummary.find(s => s.label === "Missing Records")?.value || "0");

        return NextResponse.json({
            attendanceRate,
            missingCount
        });


    } catch (e) {
        return handleApiError(e);
    }
}
