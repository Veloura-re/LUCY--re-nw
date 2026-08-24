import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming lib/prisma is set up properly

export async function POST(request: Request) {
    try {
        const secret = process.env.CHAPA_WEBHOOK_SECRET;
        if (!secret) {
            console.error('Missing CHAPA_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
        }

        const signature = request.headers.get('chapa-signature');
        const rawBody = await request.text();

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Validate the signature using HMAC SHA256
        const encoder = new TextEncoder();
        const key = await globalThis.crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await globalThis.crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(rawBody)
        );

        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (hash !== signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(rawBody);

        // Chapa sends successful charge events as "charge.success"
        if (event.event === 'charge.success') {
            const tx_ref = event.data.tx_ref; // e.g., tx-{schoolId}-{timestamp}
            
            // Extract school ID from tx_ref
            // Format is tx-schoolId-timestamp
            const parts = tx_ref.split('-');
            if (parts.length >= 3) {
                // The school ID might contain dashes if it's a UUID, so we need to reconstruct it
                const schoolId = parts.slice(1, -1).join('-');
                
                // Update school to premium/active
                await prisma.school.update({
                    where: { id: schoolId },
                    data: {
                        status: 'ACTIVE',
                        subscriptionStatus: 'active'
                    }
                });
                
                console.log(`[Chapa Webhook] Successfully processed payment for school ${schoolId}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('[Chapa Webhook Error]', err);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
