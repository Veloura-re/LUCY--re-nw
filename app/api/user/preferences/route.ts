import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, requireRole } from '@/lib/security';

export async function PATCH(request: Request) {
    try {
        const user = await requireRole(['PRINCIPAL', 'TEACHER', 'HOMEROOM', 'PARENT', 'STUDENT', 'SUPERADMIN']);
        const body = await request.json();

        // Fetch current preferences
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { preferences: true }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const currentPrefs = (dbUser.preferences as any) || {};
        const updatedPrefs = { ...currentPrefs, ...body };

        await prisma.user.update({
            where: { id: user.id },
            data: { preferences: updatedPrefs }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE_PREFERENCES', resourceType: 'user', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, preferences: updatedPrefs });
    } catch (e) {
        return handleApiError(e);
    }
}
