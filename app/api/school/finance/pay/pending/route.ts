import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/security";

export async function GET() {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER']);

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch school invoices
            const { data: invoicesData, error: invErr } = await supabaseAdmin
                .from('Invoice')
                .select('*')
                .eq('schoolId', dbUser.schoolId!);
            if (invErr) throw invErr;

            const invoiceIds = (invoicesData || []).map((inv: any) => inv.id);
            const invoiceMap = new Map((invoicesData || []).map((inv: any) => [inv.id, inv]));

            // Fetch students
            const { data: studentsData, error: sErr } = await supabaseAdmin
                .from('Student')
                .select('id, firstName, lastName, studentCode')
                .eq('schoolId', dbUser.schoolId!);
            if (sErr) throw sErr;
            const studentMap = new Map((studentsData || []).map((s: any) => [s.id, s]));

            // Fetch pending payments
            let pendingPayments: any[] = [];
            if (invoiceIds.length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('Payment')
                    .select('*')
                    .in('invoiceId', invoiceIds)
                    .eq('status', 'PENDING')
                    .order('createdAt', { ascending: false });
                if (error) throw error;

                pendingPayments = (data || []).map((p: any) => {
                    const invoice = invoiceMap.get(p.invoiceId) || null;
                    const student = invoice ? studentMap.get(invoice.studentId) || null : null;
                    return {
                        ...p,
                        invoice: invoice ? { ...invoice, student } : null
                    };
                });
            }

            return NextResponse.json(pendingPayments);
        }

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
