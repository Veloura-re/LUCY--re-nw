import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new NextResponse("Unauthorized", { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, schoolId: true }
        });

        if (!dbUser || (dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN')) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const schoolId = dbUser.schoolId;

        // 1. Orphaned Teachers (Teachers with no schoolId)
        const orphanedTeachers = await prisma.user.findMany({
            where: {
                role: 'TEACHER',
                schoolId: null
            },
            select: { id: true, name: true, email: true }
        });

        // 2. Unmapped Students (No parent link in ParentStudentLink)
        const unmappedStudents = await prisma.student.findMany({
            where: {
                schoolId: schoolId || undefined,
                parentLinks: { none: {} }
            },
            select: { id: true, firstName: true, lastName: true, studentCode: true }
        });

        // 3. Disconnected Parents (No children link in ParentStudentLink)
        const disconnectedParents = await prisma.user.findMany({
            where: {
                role: 'PARENT',
                schoolId: schoolId || undefined,
                parentLinks: { none: {} }
            },
            select: { id: true, name: true, email: true }
        });

        // 4. Idle Principals (Principals with no school)
        const idlePrincipals = await prisma.user.findMany({
            where: {
                role: 'PRINCIPAL',
                schoolId: null
            },
            select: { id: true, name: true, email: true }
        });

        return NextResponse.json({
            orphanedTeachers,
            unmappedStudents,
            disconnectedParents,
            idlePrincipals,
            timestamp: new Date().toISOString()
        });

    } catch (e: any) {
        console.error("[Connectivity Diagnostic] Error:", e);
        return new NextResponse(e.message, { status: 500 });
    }
}
