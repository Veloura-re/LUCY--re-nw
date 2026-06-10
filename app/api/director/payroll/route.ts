import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch dbUser
            const { data: dbUser } = await supabaseAdmin
                .from('User')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!dbUser || (dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            let targetSchoolId = dbUser.schoolId;
            if (!targetSchoolId && dbUser.role === 'SUPERADMIN') {
                targetSchoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
            }

            // Fetch school users
            const { data: schoolUsers } = await supabaseAdmin
                .from('User')
                .select('*')
                .eq('schoolId', targetSchoolId);

            const userMap = new Map((schoolUsers || []).map((u: any) => [u.id, u]));
            const schoolUserIds = (schoolUsers || []).map((u: any) => u.id);

            // Fetch payrolls
            let paychecks: any[] = [];
            if (schoolUserIds.length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('StaffPayroll')
                    .select('*')
                    .in('userId', schoolUserIds)
                    .order('createdAt', { ascending: false });

                if (error) throw error;
                paychecks = (data || []).map((pc: any) => ({
                    ...pc,
                    user: userMap.get(pc.userId) || null
                }));
            }

            return NextResponse.json(paychecks);
        }

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

        const paychecks = await (prisma as any).staffPayroll.findMany({
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

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch dbUser
            const { data: dbUser } = await supabaseAdmin
                .from('User')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!dbUser || (dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN')) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            const body = await req.json() as any;
            const { userId, amount, periodStart, periodEnd, note, method } = body;

            // Insert paycheck
            const { data: payroll, error } = await supabaseAdmin
                .from('StaffPayroll')
                .insert({
                    id: crypto.randomUUID(),
                    userId,
                    amount,
                    periodStart: new Date(periodStart).toISOString(),
                    periodEnd: new Date(periodEnd).toISOString(),
                    notes: note,
                    method: method || 'BANK_TRANSFER',
                    status: 'COMPLETED',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Fetch paycheck user
            const { data: targetUser } = await supabaseAdmin
                .from('User')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            return NextResponse.json({
                ...payroll,
                user: targetUser || null
            });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (dbUser?.role !== 'PRINCIPAL' && dbUser?.role !== 'SUPERADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json() as any;
        const { userId, amount, periodStart, periodEnd, note, method } = body;

        const payroll = await (prisma as any).staffPayroll.create({
            data: {
                userId,
                amount,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                notes: note,
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
