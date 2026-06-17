import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new NextResponse("Unauthorized", { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, schoolId: true }
        });

        if (!dbUser || (dbUser.role !== 'OWNER' && dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN') || !dbUser.schoolId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { teacherId } = await req.json() as any;

        if (!teacherId) {
            return new NextResponse("Missing teacherId", { status: 400 });
        }

        // Verify the teacher exists and has no schoolId
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId }
        });

        if (!teacher || teacher.role !== 'TEACHER' || teacher.schoolId) {
            return new NextResponse("Invalid teacher or already assigned", { status: 400 });
        }

        // Assign teacher to the principal's school
        await prisma.user.update({
            where: { id: teacherId },
            data: { schoolId: dbUser.schoolId }
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("[Absorb Teacher Error]", e);
        return new NextResponse(e.message, { status: 500 });
    }
}
