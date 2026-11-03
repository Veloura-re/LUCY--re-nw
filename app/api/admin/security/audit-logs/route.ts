import { getVerifiedUser, handleApiError, clientDataError } from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Authenticate requesting user
        const user = await getVerifiedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify role is SUPERADMIN
        if (prisma) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true }
            });

            // auth_audit_logs spans every school (emails and IP addresses), so it is for the platform operator only.
            if (!dbUser || dbUser.role !== 'SUPERADMIN') {
                return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
            }
        }

        let logs: any[] = [];
        if (prisma) {
            try {
                logs = await prisma.$queryRaw<any[]>`
                    SELECT id, ip_address::text, email, status, created_at 
                    FROM auth_audit_logs 
                    ORDER BY created_at DESC 
                    LIMIT 100
                `;
            } catch (e) {
                { const bad = clientDataError(e); if (bad) return bad; }
                if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
                // Table might not exist yet
                console.warn("Audit logs table not accessible:", e);
            }
        }
        
        return NextResponse.json({ logs });
    } catch (e: any) {
        { const bad = clientDataError(e); if (bad) return bad; }
        if (/^(Unauthorized|Forbidden)/.test(String((e as any)?.message))) return handleApiError(e);
        console.error("Failed to fetch audit logs", e);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
