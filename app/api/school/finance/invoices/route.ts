import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';

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

            const [invoicesRes, studentsRes] = await Promise.all([
                supabaseAdmin.from('Invoice').select('id, amount, status, dueDate, createdAt, studentId').eq('schoolId', dbUser.schoolId!).order('createdAt', { ascending: false }),
                supabaseAdmin.from('Student').select('id, firstName, lastName, studentCode').eq('schoolId', dbUser.schoolId!)
            ]);

            const invoiceIds = (invoicesRes.data || []).map((inv: any) => inv.id);
            let paymentsData: any[] = [];
            
            // Chunk the invoiceIds to prevent URL too long errors in Supabase PostgREST
            for (let i = 0; i < invoiceIds.length; i += 100) {
                const chunk = invoiceIds.slice(i, i + 100);
                const { data } = await supabaseAdmin.from('Payment')
                    .select('id, amount, method, reference, invoiceId, createdAt')
                    .in('invoiceId', chunk)
                    .order('createdAt', { ascending: false });
                if (data) paymentsData = paymentsData.concat(data);
            }

            const studentMap = new Map((studentsRes.data || []).map((s: any) => [s.id, s]));
            const paymentMap = new Map<string, any[]>();
            for (const p of paymentsData) {
                if (!paymentMap.has(p.invoiceId)) {
                    paymentMap.set(p.invoiceId, []);
                }
                paymentMap.get(p.invoiceId)!.push(p);
            }

            const invoices = (invoicesRes.data || []).map((inv: any) => {
                const payments = paymentMap.get(inv.id) || [];
                return {
                    ...inv,
                    student: studentMap.get(inv.studentId) || null,
                    payments: payments.slice(0, 1)
                };
            });

            return NextResponse.json(invoices);
        }

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
