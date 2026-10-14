import { NextResponse } from 'next/server';
import { logError, getIp, type ErrorLogType } from '@/lib/audit';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimitShared } from '@/lib/rate-limit';
import { redactSecrets } from '@/lib/error-capture';

/**
 * Receives browser-side error reports. It is reachable without a session (a crash can happen on the
 * login page), so everything in the body is untrusted: size is capped, the type must be one the
 * browser is allowed to report, text is stripped of credentials, and repeats are collapsed.
 */

const MAX_BODY_BYTES = 16 * 1024;
const CLIENT_TYPES: ReadonlySet<ErrorLogType> = new Set([
    'ui_crash', 'api_error', 'route_404', 'auth_failure', 'unhandled_rejection', 'network_error',
]);

const recent = new Map<string, number>();
const DEDUPE_MS = 30_000;

function text(value: unknown, max: number): string | undefined {
    return typeof value === 'string' && value.length > 0 ? redactSecrets(value).slice(0, max) : undefined;
}

export async function POST(request: Request) {
    const limited = await rateLimitShared(request, 'client-error', 30);
    if (limited) return limited;

    try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
            return NextResponse.json({ ok: false }, { status: 413 });
        }

        let body: Record<string, unknown>;
        try {
            body = JSON.parse(raw);
        } catch {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        const type = (CLIENT_TYPES.has(body.type as ErrorLogType) ? body.type : 'ui_crash') as ErrorLogType;
        const message = text(body.message, 2000) ?? 'Unknown error';
        const path = text(body.path, 500);

        const ip = getIp(request);
        const key = `${ip ?? ''}|${type}|${path ?? ''}|${message.slice(0, 200)}`;
        const now = Date.now();
        const previous = recent.get(key);
        if (previous && now - previous < DEDUPE_MS) {
            return NextResponse.json({ ok: true, deduped: true });
        }
        recent.set(key, now);
        if (recent.size > 500) recent.clear();

        // Attach the signed-in user when there is one; reports from visitors are still accepted
        let userId: string | undefined;
        let schoolId: string | undefined;
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, schoolId: true } });
                userId = dbUser?.id;
                schoolId = dbUser?.schoolId ?? undefined;
            }
        } catch { /* reporting must work without a session */ }

        const status = typeof body.statusCode === 'number' && Number.isInteger(body.statusCode) && body.statusCode >= 100 && body.statusCode <= 599
            ? body.statusCode : undefined;

        let metadata: Record<string, unknown> | undefined;
        if (body.metadata && typeof body.metadata === 'object') {
            const serialised = redactSecrets(JSON.stringify(body.metadata));
            if (serialised.length <= 2000) metadata = JSON.parse(serialised);
        }

        await logError({
            schoolId,
            userId,
            type,
            message,
            stack: text(body.stack, 5000),
            path,
            statusCode: status,
            ip: request.headers.get('cf-connecting-ip') || ip,
            userAgent: text(request.headers.get('user-agent'), 400),
            metadata: { ...metadata, source: 'browser' },
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
