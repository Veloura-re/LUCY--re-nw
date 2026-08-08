import { NextResponse } from 'next/server';
import { logError } from '@/lib/audit';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        // Try to get user if authenticated (non-blocking)
        let userId: string | undefined;
        let schoolId: string | undefined;
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                userId = user.id;
                // Get schoolId from user metadata or db
                if (prisma) {
                    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { schoolId: true } });
                    schoolId = dbUser?.schoolId || undefined;
                }
            }
        } catch { /* non-blocking */ }

        const body = await request.json() as {
            type: 'ui_crash' | 'api_error' | 'route_404' | 'auth_failure' | 'unhandled_rejection' | 'network_error';
            message: string;
            stack?: string;
            path?: string;
            statusCode?: number;
            metadata?: Record<string, any>;
        };

        await logError({
            schoolId,
            userId,
            type: body.type || 'ui_crash',
            message: body.message || 'Unknown error',
            stack: body.stack,
            path: body.path,
            statusCode: body.statusCode,
            ip,
            userAgent,
            metadata: body.metadata,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
