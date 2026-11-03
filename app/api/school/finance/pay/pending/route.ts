import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, FINANCE_ROLES } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        const pendingPayments = await prisma.payment.findMany({
            where: {
                status: 'PENDING',
                invoice: {
                    schoolId: dbUser.schoolId!
                }
            },
            include: {
                invoice: {
                    include: {
                        student: {
                            select: { firstName: true, lastName: true, studentCode: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(pendingPayments);
    } catch (error: any) {
        return handleApiError(error);
    }
}
