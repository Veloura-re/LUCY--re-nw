import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Authenticate requesting user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify role is ADMIN or SUPERADMIN
        if (prisma) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true }
            });

            if (!dbUser || (dbUser.role !== 'SUPERADMIN' && dbUser.role !== 'OWNER' && dbUser.role !== 'PRINCIPAL')) {
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
                // Table might not exist yet
                console.warn("Audit logs table not accessible:", e);
            }
        }
        
        return NextResponse.json({ logs });
    } catch (e: any) {
        console.error("Failed to fetch audit logs", e);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
