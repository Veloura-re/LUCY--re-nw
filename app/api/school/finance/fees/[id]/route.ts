import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: feeId } = await params;
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        await prisma.feeStructure.delete({
            where: {
                id: feeId,
                schoolId: dbUser.schoolId!
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return handleApiError(error);
    }
}
