import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, secureJson } from "@/lib/security";

export async function GET(req: Request) {
    try {
        const dbUser = await requireRole(["SUPERADMIN", "OWNER", "PRINCIPAL"]);

        const schoolId = dbUser.schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "No active school context." }, { status: 400 });
        }

        const expenses = await (prisma as any).institutionalExpense.findMany({
            where: { schoolId },
            include: {
                loggedBy: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return secureJson(expenses);
    } catch (error: any) {
        console.error("GET /api/school/finance/expenses error:", error);
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(["SUPERADMIN", "OWNER", "PRINCIPAL"]);

        const schoolId = dbUser.schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "No active school context." }, { status: 400 });
        }

        const body = await req.json() as any;
        const { title, amount, category, description, receiptUrl } = body;

        if (!title || !amount || !category) {
            return NextResponse.json({ error: "Missing required fields (title, amount, category)." }, { status: 400 });
        }

        const newExpense = await (prisma as any).institutionalExpense.create({
            data: {
                schoolId,
                title,
                amount: parseFloat(amount),
                category,
                description,
                receiptUrl,
                loggedById: dbUser.id
            },
            include: {
                loggedBy: {
                    select: { name: true, role: true }
                }
            }
        });

        return secureJson(newExpense);
    } catch (error: any) {
        console.error("POST /api/school/finance/expenses error:", error);
        return handleApiError(error);
    }
}
