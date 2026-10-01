import { NextResponse } from 'next/server';
import { requireRole, requireAuth, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['SUPERADMIN', 'OWNER', 'PRINCIPAL']);
        const body = (await request.json().catch(() => ({}))) as { amount: number; reference: string; receiptUrl: string; notes?: string };
        const { amount, reference, receiptUrl, notes } = body;

        if (!amount || !reference || !receiptUrl) {
            return NextResponse.json({ error: 'Missing amount, reference or receipt URL' }, { status: 400 });
        }

        const schoolId = user.schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: 'No school associated with this account.' }, { status: 400 });
        }

        await prisma.billingReceipt.create({
            data: {
                schoolId: schoolId,
                submittedById: user.id,
                amount: Number(amount),
                reference,
                receiptUrl,
                status: 'PENDING',
                notes: notes || ''
            }
        });

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId, action: 'CREATE_BILLING_RECEIPT', resourceType: 'billing', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ 
            success: true, 
            message: 'Manual payment receipt submitted successfully for verification.' 
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}

export async function GET(request: Request) {
    try {
        const authUser = await requireAuth();
        
        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                schoolId: true,
                role: true,
                student: { select: { schoolId: true } },
                parentLinks: { select: { student: { select: { schoolId: true } } } }
            }
        });
        
        let schoolId = dbUser?.schoolId || dbUser?.student?.schoolId || dbUser?.parentLinks?.[0]?.student?.schoolId || null;
        if (!schoolId && dbUser?.role === 'SUPERADMIN') {
            const url = new URL(request.url);
            schoolId = url.searchParams.get('schoolId') || null;
        }

        if (!schoolId) {
            return NextResponse.json({ receipts: [] });
        }

        const receipts = await prisma.billingReceipt.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ receipts });
    } catch (error: any) {
        return handleApiError(error);
    }
}
export const dynamic = 'force-dynamic';
