export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { createIssuingCardholderAndCard } from '@/lib/stripe';
import { logActivity } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL']);
        const schoolId = user.schoolId!;

        const body = (await request.json().catch(() => ({}))) as any;
        const { cardholderName, cardholderEmail, monthlyLimit = 500 } = body;

        if (!cardholderName || !cardholderEmail) {
            return NextResponse.json(
                { error: 'cardholderName and cardholderEmail are required.' },
                { status: 400 }
            );
        }

        const monthlyLimitCents = Math.round(Number(monthlyLimit) * 100);

        const { cardholder, card } = await createIssuingCardholderAndCard({
            name: cardholderName,
            email: cardholderEmail,
            monthlySpendingLimitCents: monthlyLimitCents,
            schoolId,
        });

        try {
            await logActivity({
                userId: user.id,
                schoolId,
                action: 'CREATE_ISSUING_CARD',
                resourceType: 'treasury',
                after: {
                    cardholderId: cardholder.id,
                    cardId: card.id,
                    monthlyLimitCents,
                    last4: card.last4,
                },
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            cardholder: {
                id: cardholder.id,
                name: cardholder.name,
                email: cardholder.email,
                status: cardholder.status,
            },
            card: {
                id: card.id,
                brand: card.brand,
                last4: card.last4,
                expMonth: card.exp_month,
                expYear: card.exp_year,
                type: card.type,
                status: card.status,
            },
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
