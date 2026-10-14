import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';
import { withAudit } from '@/lib/with-audit';

async function handleDELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);

        await prisma.unitPack.delete({
            where: {
                id,
                schoolId: dbUser.schoolId!
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (e) {
        return handleApiError(e);
    }
}

export const DELETE = withAudit(handleDELETE, { action: 'DELETE_UNIT_PACK', resourceType: 'unit_pack' });
