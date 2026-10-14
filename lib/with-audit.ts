import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { logActivity, getIp } from '@/lib/audit';

type AuditMeta = { action: string; resourceType: string };

/**
 * Wraps a mutating route handler so every successful call is recorded in the audit log with the
 * acting user and their school. The handler itself is unchanged; failures (status 400 and above)
 * are not recorded here because nothing was mutated.
 *
 * An entry that cannot be tied to a school is skipped instead of written with a null schoolId.
 */
export function withAudit<A extends unknown[]>(
    handler: (request: Request, ...rest: A) => Promise<Response>,
    meta: AuditMeta
) {
    return async (request: Request, ...rest: A): Promise<Response> => {
        const response = await handler(request, ...rest);

        if (response.status < 400) {
            try {
                const supabase = await createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const actor = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { id: true, schoolId: true },
                    });
                    if (actor?.schoolId) {
                        await logActivity({
                            userId: actor.id,
                            schoolId: actor.schoolId,
                            action: meta.action,
                            resourceType: meta.resourceType,
                            path: new URL(request.url).pathname,
                            ip: getIp(request),
                        });
                    } else if (actor) {
                        console.warn(`[withAudit] ${meta.action} skipped: actor has no school to record against.`);
                    }
                }
            } catch (e) {
                // Auditing must never turn a successful mutation into a failure
                console.error('[withAudit] Could not record audit entry:', e);
            }
        }

        return response;
    };
}
