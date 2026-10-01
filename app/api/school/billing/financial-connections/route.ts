import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getStripe, createFinancialConnectionsSession } from '@/lib/stripe';
import { logActivity } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const schoolId = user.schoolId!;

        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (!school) {
            return NextResponse.json({ error: 'School record not found.' }, { status: 404 });
        }

        let customerId = school.stripeCustomerId;
        if (!customerId) {
            const customer = await getStripe().customers.create({
                email: user.email,
                name: school.name,
                metadata: {
                    schoolId,
                },
            });
            customerId = customer.id;

            await prisma.school.update({
                where: { id: schoolId },
                data: { stripeCustomerId: customerId },
            });
        }

        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const returnUrl = `${domain}/dashboard/billing?bank_linked=true`;

        const session = await createFinancialConnectionsSession(customerId, returnUrl);

        try {
            await logActivity({
                userId: user.id,
                schoolId,
                action: 'INITIATE_FINANCIAL_CONNECTIONS',
                resourceType: 'banking',
                after: {
                    sessionId: session.id,
                    customerId,
                },
            });
        } catch { /* non-blocking */ }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                clientSecret: session.client_secret,
                permissions: session.permissions,
            },
        });
    } catch (error: any) {
        return handleApiError(error);
    }
}
export const dynamic = 'force-dynamic';
