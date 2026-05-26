import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const [feesRes, gradesRes] = await Promise.all([
                supabaseAdmin.from('FeeStructure').select('*').eq('schoolId', dbUser.schoolId!).order('createdAt', { ascending: false }),
                supabaseAdmin.from('Grade').select('*').eq('schoolId', dbUser.schoolId!)
            ]);
            const gradeMap = new Map((gradesRes.data || []).map((g: any) => [g.id, g]));
            const fees = (feesRes.data || []).map((fee: any) => ({
                ...fee,
                grade: fee.gradeId ? gradeMap.get(fee.gradeId) || null : null
            }));
            return NextResponse.json(fees);
        }

        const fees = await prisma.feeStructure.findMany({
            where: { schoolId: dbUser.schoolId! },
            include: { grade: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(fees);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL', 'SUPERADMIN']);

        const body = await req.json();
        const { name, amount, category, frequency, gradeId, description } = body;

        if (!name || amount === undefined || !category || !frequency) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: fee, error } = await supabaseAdmin
                .from('FeeStructure')
                .insert({
                    schoolId: dbUser.schoolId!,
                    gradeId: gradeId || null,
                    name,
                    amount: parseFloat(amount),
                    category,
                    frequency,
                    description: description || null
                })
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(fee);
        }

        const fee = await prisma.feeStructure.create({
            data: {
                schoolId: dbUser.schoolId!,
                gradeId,
                name,
                amount: parseFloat(amount),
                category,
                frequency,
                description
            }
        });

        return NextResponse.json(fee);
    } catch (error) {
        return handleApiError(error);
    }
}
