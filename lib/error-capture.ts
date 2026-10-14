import { headers } from 'next/headers';
import { logError, type ErrorLogType, type LogLevel } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { sendEmail } from '@/lib/email';

/**
 * Server-side error capture for the superadmin error log.
 *
 * Without this, a failure inside an API route only prints to the console and the superadmin never
 * sees it. Capture is best effort and must never throw or slow a response noticeably.
 */

/** Failure types that justify an email to ALERT_EMAIL. */
const ALERT_TYPES: ReadonlySet<ErrorLogType> = new Set(['webhook_failure', 'payment_failure', 'cron_failure']);

const DEDUPE_WINDOW_MS = 60_000;
const ALERT_WINDOW_MS = 15 * 60_000;
const MAX_CAPTURES_PER_MINUTE = 40;

const lastSeen = new Map<string, number>();
const lastAlert = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;
let capturing = false;

const SECRET_PATTERNS: Array<[RegExp, string]> = [
    [/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://[redacted]'],
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[jwt-redacted]'],
    [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [redacted]'],
    [/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g, '[stripe-key-redacted]'],
    [/\bre_[A-Za-z0-9_]{16,}/g, '[resend-key-redacted]'],
    [/\bAIza[0-9A-Za-z_-]{20,}/g, '[google-key-redacted]'],
    [/((?:password|passwd|secret|token|api[_-]?key|authorization)\s*[=:]\s*)[^\s,;'"]+/gi, '$1[redacted]'],
];

/** Removes credentials and connection strings so a log entry can never become a leak of its own. */
export function redactSecrets(text: string): string {
    return SECRET_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

function waitUntil(promise: Promise<unknown>) {
    // On Cloudflare Workers a response can end the invocation; waitUntil keeps the write alive
    const ctx = (globalThis as Record<symbol, any>)[Symbol.for('__cloudflare-context__')]?.ctx;
    if (ctx?.waitUntil) ctx.waitUntil(promise);
}

async function readRequestContext() {
    try {
        const h = await headers();
        return {
            path: h.get('x-pathname') || undefined,
            ip: h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
            userAgent: h.get('user-agent') || undefined,
        };
    } catch {
        return {}; // not inside a request (cron, startup)
    }
}

async function resolveActor() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {};
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, schoolId: true } });
        return { userId: dbUser?.id, schoolId: dbUser?.schoolId ?? undefined };
    } catch {
        return {};
    }
}

export type CaptureOptions = {
    type?: ErrorLogType;
    level?: LogLevel;
    status?: number;
    /** Non-sensitive facts that help diagnose the failure, such as a transaction reference. */
    context?: Record<string, unknown>;
};

/**
 * Records a server-side failure in the error log. Call as `void reportServerError(err)`.
 * Repeated identical failures within a minute are written once, and bursts are capped so an outage
 * cannot flood the table.
 */
export function reportServerError(error: unknown, options: CaptureOptions = {}): Promise<void> {
    const task = capture(error, options).catch(() => undefined);
    waitUntil(task);
    return task;
}

async function capture(error: unknown, options: CaptureOptions): Promise<void> {
    if (capturing) return; // an error while capturing must not recurse
    capturing = true;
    try {
        const now = Date.now();
        if (now - windowStart > 60_000) { windowStart = now; windowCount = 0; }
        if (++windowCount > MAX_CAPTURES_PER_MINUTE) return;

        const type = options.type ?? 'api_error';
        const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Non-error value thrown';
        const message = redactSecrets(rawMessage || 'Unknown error').slice(0, 2000);
        const stack = error instanceof Error && error.stack ? redactSecrets(error.stack).slice(0, 5000) : undefined;

        const ctx = await readRequestContext();
        const key = `${type}|${ctx.path ?? ''}|${message.slice(0, 200)}`;
        const previous = lastSeen.get(key);
        if (previous && now - previous < DEDUPE_WINDOW_MS) return;
        lastSeen.set(key, now);
        if (lastSeen.size > 500) lastSeen.clear();

        const actor = await resolveActor();

        await logError({
            ...actor,
            type,
            level: options.level ?? 'ERROR',
            message,
            stack,
            path: ctx.path,
            statusCode: options.status,
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            metadata: buildMetadata(options.context),
        });

        await maybeAlert(type, message, ctx.path, now);
    } finally {
        capturing = false;
    }
}

/** Serialises context with secrets removed; oversized context is replaced rather than cut mid-value. */
function buildMetadata(context?: Record<string, unknown>) {
    if (!context) return undefined;
    try {
        const redacted = redactSecrets(JSON.stringify(context));
        return redacted.length <= 4000 ? JSON.parse(redacted) : { truncated: true };
    } catch {
        return undefined;
    }
}

async function maybeAlert(type: ErrorLogType, message: string, path: string | undefined, now: number) {
    const to = process.env.ALERT_EMAIL;
    if (!to || !ALERT_TYPES.has(type)) return;

    const last = lastAlert.get(type);
    if (last && now - last < ALERT_WINDOW_MS) return;
    lastAlert.set(type, now);

    const esc = (v: string) => v.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    await sendEmail({
        to,
        subject: `LUCY alert: ${type.replace('_', ' ')}`,
        html: `<p>A <strong>${esc(type)}</strong> was recorded${path ? ` on <code>${esc(path)}</code>` : ''}.</p><pre>${esc(message)}</pre><p>Open the superadmin error log for details. Further alerts of this type are held for 15 minutes.</p>`,
    });
}

/** Test hook: clear throttling state. */
export function resetErrorCaptureState() {
    lastSeen.clear();
    lastAlert.clear();
    windowStart = 0;
    windowCount = 0;
    capturing = false;
}
