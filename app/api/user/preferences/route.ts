import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';
import { mergeUserPreferences } from '@/lib/user-preferences';

import { logActivity } from '@/lib/audit';
export async function PATCH(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT', 'SUPERADMIN']);
        const body = (await request.json()) as any;

        // Fetch current preferences
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { preferences: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Only whitelisted UI toggles are accepted; server-owned flags (e.g. fullAccess) are preserved.
        const updatedPrefs = mergeUserPreferences(dbUser.preferences, body);

        await prisma.user.update({
            where: { id: user.id },
            data: { preferences: updatedPrefs }
        });

        
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, schoolId: user.schoolId || undefined, action: 'UPDATE_PREFERENCES', resourceType: 'user', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, preferences: updatedPrefs });
    } catch (e) {
        return handleApiError(e);
    }
}
