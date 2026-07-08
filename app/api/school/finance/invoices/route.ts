import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const search = searchParams.get('search')?.toLowerCase() || '';
        const status = searchParams.get('status') || 'ALL';
        const offset = (page - 1) * limit;

        const { prisma } = require('@/lib/prisma');
        if (!prisma) {
            const { createClient: createSupabaseAdmin } = require('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Fetch students first if we have a search term
            let studentIds: string[] | undefined = undefined;
            if (search) {
                const { data: students } = await supabaseAdmin
                    .from('Student')
                    .select('id')
                    .eq('schoolId', dbUser.schoolId!)
                    .or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,studentCode.ilike.%${search}%`);
                studentIds = students?.map((s: any) => s.id) || [];
                if (studentIds.length === 0) {
                    return NextResponse.json({ invoices: [], pagination: { page, limit, totalPages: 0, total: 0 } });
                }
            }

            let query = supabaseAdmin
                .from('Invoice')
                .select('id, amount, status, dueDate, createdAt, studentId', { count: 'exact' })
                .eq('schoolId', dbUser.schoolId!);

            if (status !== 'ALL') {
                query = query.eq('status', status);
            }
            if (studentIds) {
                query = query.in('studentId', studentIds);
            }

            query = query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1);

            const [invoicesRes, studentsRes] = await Promise.all([
                query,
                supabaseAdmin.from('Student').select('id, firstName, lastName, studentCode').eq('schoolId', dbUser.schoolId!)
            ]);

            const invoiceIds = (invoicesRes.data || []).map((inv: any) => inv.id);
            let paymentsData: any[] = [];
            
            if (invoiceIds.length > 0) {
                const { data } = await supabaseAdmin.from('Payment')
                    .select('id, amount, method, reference, invoiceId, createdAt')
                    .in('invoiceId', invoiceIds)
                    .order('createdAt', { ascending: false });
                if (data) paymentsData = data;
            }

            const studentMap = new Map((studentsRes.data || []).map((s: any) => [s.id, s]));
            const paymentMap = new Map<string, any[]>();
            for (const p of paymentsData) {
                if (!paymentMap.has(p.invoiceId)) paymentMap.set(p.invoiceId, []);
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

            return NextResponse.json({
                invoices,
                pagination: {
                    page,
                    limit,
                    total: invoicesRes.count || 0,
                    totalPages: Math.ceil((invoicesRes.count || 0) / limit)
                }
            });
        }

        // Prisma Fallback
        const where: any = { schoolId: dbUser.schoolId! };
        if (status !== 'ALL') where.status = status;
        if (search) {
            where.student = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { studentCode: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [total, invoices] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
                where,
                include: {
                    student: { select: { firstName: true, lastName: true, studentCode: true } },
                    payments: { orderBy: { createdAt: 'desc' }, take: 1 }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            })
        ]);

        return NextResponse.json({
            invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}
