import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getIp, logActivity } from '@/lib/audit';
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from '@/lib/legal-versions';

export type ConsentSource =
    | 'login'
    | 'register-student'
    | 'register-parent'
    | 'register-admin'
    | 'register-invite'
    | 'accept-terms';

type ConsentClient = Pick<Prisma.TransactionClient, 'consentRecord' | 'user'>;

interface ConsentInput {
    userId: string;
    source: ConsentSource;
    request?: Request | null;
}

/**
 * Writes the consent rows and the user's fast-check column. Idempotent per user and version, so it
 * is safe on every login. Takes a client so a registration transaction can include it. Returns
 * whether anything new was stored.
 */
export async function storeConsent(client: ConsentClient, { userId, source, request }: ConsentInput): Promise<boolean> {
    const current = await client.user.findUnique({ where: { id: userId }, select: { legalVersionAccepted: true } });
    if (current?.legalVersionAccepted === LEGAL_VERSION) return false;

    const created = await client.consentRecord.createMany({
        data: LEGAL_DOCUMENTS.map((documentType) => ({
            userId,
            documentType,
            version: LEGAL_VERSION,
            source,
            ip: getIp(request),
            userAgent: request?.headers.get('user-agent')?.slice(0, 300) || undefined,
        })),
        skipDuplicates: true,
    });
    await client.user.update({ where: { id: userId }, data: { legalVersionAccepted: LEGAL_VERSION } });
    return created.count > 0;
}

/**
 * Stores consent and adds a secondary audit entry. The ConsentRecord rows are the legal record;
 * logActivity swallows its own errors, so the audit trail alone would not be proof.
 */
export async function recordConsent(input: ConsentInput): Promise<{ recorded: boolean }> {
    const recorded = await storeConsent(prisma, input);
    if (recorded) {
        await logActivity({
            userId: input.userId,
            action: 'ACCEPT_TERMS',
            resourceType: 'ConsentRecord',
            resourceId: input.userId,
            ip: getIp(input.request),
            userAgent: input.request?.headers.get('user-agent')?.slice(0, 300) || undefined,
            after: { version: LEGAL_VERSION, source: input.source },
        });
    }
    return { recorded };
}
