import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';

export async function GET() {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const invoices = await prisma.invoice.findMany({
            where: { schoolId: dbUser.schoolId! },
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentCode: true }
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(invoices);
    } catch (e) {
        return handleApiError(e);
    }
}
