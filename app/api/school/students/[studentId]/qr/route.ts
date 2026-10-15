import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ALL_ROLES, handleApiError } from "@/lib/security";
import { signStudentPayload } from "@/lib/student-id-security";
import { canViewStudent } from "@/lib/student-access";

/**
 * Returns the server-signed credential parameters for a student's ID card QR code.
 * The signing secret never leaves the server, so the card must obtain the signature here.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const viewer = await requireRole(ALL_ROLES);
        const { studentId } = await params;

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, schoolId: true, userId: true, studentCode: true }
        });

        if (!student || !(await canViewStudent(viewer, student))) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        return NextResponse.json({
            sid: student.schoolId,
            sig: signStudentPayload(student.id, student.schoolId),
            code: student.studentCode
        });
    } catch (e) {
        return handleApiError(e);
    }
}
