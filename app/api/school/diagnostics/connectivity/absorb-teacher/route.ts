import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAudit } from '@/lib/with-audit';
import { publicErrorMessage, getVerifiedUser, handleApiError, clientDataError } from '@/lib/security';

async function handlePOST(req: Request) {
    try {
        const user = await getVerifiedUser();
        if (!user) return new NextResponse("Unauthorized", { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, schoolId: true }
        });

        // Orphaned teachers are only listed to a SUPERADMIN, so only a SUPERADMIN may assign one.
        if (!dbUser || dbUser.role !== 'SUPERADMIN' || !dbUser.schoolId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { teacherId } = ((await req.json().catch(() => ({}))) || {}) as any;

        if (!teacherId || typeof teacherId !== 'string') {
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
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error("[Absorb Teacher Error]", e);
        return new NextResponse(publicErrorMessage(e), { status: 500 });
    }
}

export const POST = withAudit(handlePOST, { action: 'ABSORB_TEACHER', resourceType: 'staff' });
