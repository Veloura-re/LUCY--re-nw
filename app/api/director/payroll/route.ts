import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (dbUser?.role !== 'PRINCIPAL' && dbUser?.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

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
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(paychecks);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (dbUser?.role !== 'PRINCIPAL' && dbUser?.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json() as any;
        let { userId, amount, periodStart, periodEnd, note, method } = body;

        // Fallback method if somehow they pass CHEQUE or something not in the enum
        const validMethods = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"];
        if (!validMethods.includes(method)) {
            method = "OTHER";
        }

        const payroll = await prisma.staffPayroll.create({
            data: {
                userId,
                amount,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                notes: note || null,
                method: method || 'BANK_TRANSFER',
                status: 'COMPLETED'
            },
            include: {
                user: true
            }
        });

        return NextResponse.json(payroll);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: publicErrorMessage(e, "Internal Server Error") }, { status: 500 });
    }
}
