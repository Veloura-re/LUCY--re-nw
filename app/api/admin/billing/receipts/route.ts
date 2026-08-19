import { NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const dbUser = await verifySuperAdmin();
    if (!dbUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const receipts = await prisma.billingReceipt.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                school: {
                    select: { id: true, name: true, schoolCode: true }
                },
                submittedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        // Backfill any missing school/submittedBy references
        for (const r of receipts) {
            if (!r.school && r.schoolId) {
                const foundSchool = await prisma.school.findUnique({
                    where: { id: r.schoolId },
                    select: { id: true, name: true }
                });
                if (foundSchool) (r as any).school = foundSchool;
            }
            if (!r.submittedBy && r.submittedById) {
                const foundUser = await prisma.user.findUnique({
                    where: { id: r.submittedById },
                    select: { id: true, name: true, email: true }
                });
                if (foundUser) (r as any).submittedBy = foundUser;
            }
        }

        return NextResponse.json({ receipts });
    } catch (error: any) {
        console.error('[AdminBillingReceipts/GET] Error:', error.message);
        return NextResponse.json({ receipts: [] });
    }
}
