import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolLinked, handleApiError } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400 });
        }

        // Find the student with this code, strictly matching tenant if applicable
        const student = await prisma.student.findUnique({
            where: { studentCode: code },
            include: { user: true }
        });

        // Only allow finding students in the same school if checking from school
        if (!student || !student.user || student.schoolId !== dbUser.schoolId) {
            return NextResponse.json({ users: [] }); // Return empty if not found or not registered
        }

        // Return limited info
        return NextResponse.json({
            users: [{
                id: student.user.id,
                name: student.user.name,
                role: "STUDENT",
            }]
        });
    } catch (error) {
        return handleApiError(error);
    }
}
