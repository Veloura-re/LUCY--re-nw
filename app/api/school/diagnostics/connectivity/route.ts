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

<<<<<<< HEAD
        // parallelize lookups for maximum Edge performance
        const [orphanedTeachers, unmappedStudents, disconnectedParents, idlePrincipals] = await Promise.all([
            // 1. Orphaned Teachers (Teachers with no schoolId)
            prisma.user.findMany({
                where: { role: 'TEACHER', schoolId: null },
                select: { id: true, name: true, email: true }
            }),
            // 2. Unmapped Students (No parent link in ParentStudentLink)
            prisma.student.findMany({
                where: { schoolId: schoolId || undefined, parentLinks: { none: {} } },
                select: { id: true, firstName: true, lastName: true, studentCode: true }
            }),
            // 3. Disconnected Parents (No children link in ParentStudentLink)
            prisma.user.findMany({
                where: { role: 'PARENT', schoolId: schoolId || undefined, parentLinks: { none: {} } },
                select: { id: true, name: true, email: true }
            }),
            // 4. Idle Principals (Principals with no school)
            prisma.user.findMany({
                where: { role: 'PRINCIPAL', schoolId: null },
                select: { id: true, name: true, email: true }
            })
        ]);
=======
        // Sequential lookups for stability on Cloudflare Edge
        const orphanedTeachers = await prisma.user.findMany({
            where: { role: 'TEACHER', schoolId: null },
            select: { id: true, name: true, email: true }
        });

        const unmappedStudents = await prisma.student.findMany({
            where: { schoolId: schoolId || undefined, parentLinks: { none: {} } },
            select: { id: true, firstName: true, lastName: true, studentCode: true }
        });

        const disconnectedParents = await prisma.user.findMany({
            where: { role: 'PARENT', schoolId: schoolId || undefined, parentLinks: { none: {} } },
            select: { id: true, name: true, email: true }
        });

        const idlePrincipals = await prisma.user.findMany({
            where: { role: 'PRINCIPAL', schoolId: null },
            select: { id: true, name: true, email: true }
        });
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533

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
