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

        if (!dbUser || (dbUser.role !== 'OWNER' && dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN')) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const isSuperAdmin = dbUser.role === 'SUPERADMIN';
        const schoolId = dbUser.schoolId;

        if (!isSuperAdmin && !schoolId) {
            return new NextResponse("School association missing", { status: 400 });
        }

        // Global orphan checks are restricted exclusively to Superadmins
        const orphanedTeachers = isSuperAdmin ? await prisma.user.findMany({
            where: { role: 'TEACHER', schoolId: null },
            select: { id: true, name: true, email: true }
        }) : [];

        const idlePrincipals = isSuperAdmin ? await prisma.user.findMany({
            where: { role: 'PRINCIPAL', schoolId: null },
            select: { id: true, name: true, email: true }
        }) : [];

        // Tenant-scoped lookups
        const unmappedStudents = schoolId ? await prisma.student.findMany({
            where: { schoolId, parentLinks: { none: {} } },
            select: { id: true, firstName: true, lastName: true, studentCode: true }
        }) : [];

        const disconnectedParents = schoolId ? await prisma.user.findMany({
            where: { role: 'PARENT', schoolId, parentLinks: { none: {} } },
            select: { id: true, name: true, email: true }
        }) : [];

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
