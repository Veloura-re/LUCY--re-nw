import { prisma } from '@/lib/prisma';

/** Sign-in trail shown on the security page. Never blocks authentication if the write fails. */
export async function recordAuthAudit(ip: string, email: string, status: string) {
    if (!prisma) return;
    try {
        await prisma.$executeRaw`
            INSERT INTO auth_audit_logs (ip_address, email, status)
            VALUES (${ip}::inet, ${email}, ${status})
        `;
    } catch {
        // Suppress audit log errors to prevent blocking authentication
    }
}
