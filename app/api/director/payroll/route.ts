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

        const paychecks = await (prisma as any).staffPayroll.findMany({
            where: {
                user: {
                    schoolId: dbUser.schoolId
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

        const { userId, amount, periodStart, periodEnd, notes, method } = await req.json();

        const payroll = await (prisma as any).staffPayroll.create({
            data: {
                userId,
                amount,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                notes,
                method: method || 'BANK_TRANSFER',
                status: 'COMPLETED' // Simplified for now
            },
            include: {
                user: true
            }
        });

        return NextResponse.json(payroll);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
