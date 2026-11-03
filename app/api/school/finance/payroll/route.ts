import { getVerifiedUser, handleApiError, clientDataError } from '@/lib/security';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const user = await getVerifiedUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const paychecks = await (prisma as any).staffPayroll.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ paychecks });
    } catch (e) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
