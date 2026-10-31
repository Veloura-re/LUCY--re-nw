import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, FINANCE_ROLES } from "@/lib/security";
import { logActivity } from "@/lib/audit";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: feeId } = await params;
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        const fee = await prisma.feeStructure.findUnique({
            where: { id: feeId }
        });

        if (!fee || (fee.schoolId !== dbUser.schoolId && dbUser.role !== 'SUPERADMIN')) {
            return new NextResponse("Fee structure not found", { status: 404 });
        }

        // Nullify foreign key reference on invoice line items to preserve historical bills while allowing protocol deletion atomically
        await prisma.$transaction(async (tx) => {
            await tx.invoiceItem.updateMany({
                where: { feeStructureId: feeId },
                data: { feeStructureId: null }
            });

            await tx.feeStructure.delete({
                where: { id: feeId }
            });
        });

        const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
        await logActivity({
            userId: dbUser.id,
            schoolId: fee.schoolId,
            action: 'DELETE_FEE_STRUCTURE',
            resourceType: 'FEE_STRUCTURE',
            resourceId: feeId,
            ip,
            before: { id: fee.id, name: fee.name, amount: fee.amount }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return handleApiError(error);
    }
}
