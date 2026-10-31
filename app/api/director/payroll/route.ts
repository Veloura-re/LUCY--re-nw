import { publicErrorMessage, requireRole, handleApiError, FINANCE_ROLES } from '@/lib/security';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAudit } from '@/lib/with-audit';
import { reportServerError } from '@/lib/error-capture';

const PAYEE_FIELDS = { id: true, name: true, email: true, role: true, photoUrl: true } as const;

export async function GET() {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        let targetSchoolId = dbUser.schoolId;
        if (!targetSchoolId && dbUser.role === 'SUPERADMIN') {
            targetSchoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
        }

        const paychecks = await prisma.staffPayroll.findMany({
            where: {
                user: {
                    schoolId: targetSchoolId
                }
            },
            include: {
                user: { select: PAYEE_FIELDS }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(paychecks);
    } catch (e) {
        return handleApiError(e);
    }
}

async function handlePOST(req: Request) {
    try {
        const dbUser = await requireRole(FINANCE_ROLES);

        const body = await req.json() as any;
        let { userId, amount, periodStart, periodEnd, note, method } = body;

        const numericAmount = Number(amount);
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        if (typeof userId !== 'string' || !Number.isFinite(numericAmount) || numericAmount <= 0 || isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: "A staff member, a positive amount and a valid pay period are required" }, { status: 400 });
        }

        // The payee must belong to the caller's school; only the platform role may pay across schools.
        if (dbUser.role !== 'SUPERADMIN') {
            const payee = await prisma.user.findFirst({
                where: { id: userId, schoolId: dbUser.schoolId },
                select: { id: true }
            });
            if (!payee) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        // Fallback method if somehow they pass CHEQUE or something not in the enum
        const validMethods = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"];
        if (!validMethods.includes(method)) {
            method = "OTHER";
        }

        const payroll = await prisma.staffPayroll.create({
            data: {
                userId,
                amount: numericAmount,
                periodStart: start,
                periodEnd: end,
                notes: note || null,
                method: method || 'BANK_TRANSFER',
                status: 'COMPLETED'
            },
            include: {
                user: { select: PAYEE_FIELDS }
            }
        });

        return NextResponse.json(payroll);
    } catch (e: any) {
        if (/^(Unauthorized|Forbidden)/.test(String(e?.message))) return handleApiError(e);
        console.error(e);
        void reportServerError(e, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(e, "Internal Server Error") }, { status: 500 });
    }
}

export const POST = withAudit(handlePOST, { action: 'PAYROLL_UPDATE', resourceType: 'payroll' });
