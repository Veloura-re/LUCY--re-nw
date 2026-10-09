import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";
import { logActivity, getIp } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
    try {
        const admin = await requireRole(['SUPERADMIN']);

        const { messageId, isPinned, isDeleted }: any = await req.json().catch(() => ({}));

        if (typeof messageId !== 'string' || !messageId) {
            return NextResponse.json({ error: "messageId is required" }, { status: 400 });
        }

        const target = await prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, schoolId: true }
        });

        if (!target) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        if (isDeleted === true) {
            await prisma.message.delete({ where: { id: target.id } });

            if (target.schoolId) {
                await logActivity({
                    userId: admin.id,
                    schoolId: target.schoolId,
                    action: 'MODERATE_MESSAGE',
                    resourceType: 'message',
                    resourceId: target.id,
                    ip: getIp(req)
                });
            }
            return NextResponse.json({ success: true });
        }

        const updated = await prisma.message.update({
            where: { id: target.id },
            data: {
                isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
            }
        });

        return NextResponse.json({ message: updated });
    } catch (e) {
        return handleApiError(e);
    }
}
