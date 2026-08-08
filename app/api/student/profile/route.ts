import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        const student = await prisma.student.findUnique({
            where: { userId: dbUser.id },
            include: {
                grade: true,
                class: {
                    include: {
                        homeroomTeacher: { select: { name: true, email: true } }
                    }
                },
                school: { select: { name: true, address: true, logoUrl: true } },
                attendanceRecords: {
                    select: { status: true },
                },
                gradeRecords: {
                    include: {
                        subject: { select: { name: true } },
                        exam: { select: { title: true, totalMarks: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                absenceAuthorizations: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

        const total = student.attendanceRecords.length;
        const present = student.attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendancePct = total > 0 ? (present / total * 100).toFixed(1) : "100.0";

        const avgScore = student.gradeRecords.length > 0
            ? (student.gradeRecords.reduce((acc, g) => acc + g.score, 0) / student.gradeRecords.length).toFixed(1)
            : "0.0";

        return NextResponse.json({
            student: {
                ...student,
                attendanceRecords: undefined,
            },
            stats: {
                attendancePct,
                avgScore,
                totalRecords: total,
                presentCount: present,
            }
        });
    } catch (e: any) {
        return handleApiError(e);
    }
}

export async function PATCH(req: Request) {
    try {
        const dbUser = await requireRole(['STUDENT']);

        const { photoUrl } = await req.json();

        const updated = await prisma.student.updateMany({
            where: { userId: dbUser.id },
            data: { photoUrl }
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || req?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'student_action', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (e: any) {
        return handleApiError(e);
    }
}
