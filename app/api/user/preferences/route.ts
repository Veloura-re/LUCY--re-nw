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

        return NextResponse.json({ success: true, preferences: updatedPrefs });
    } catch (e) {
        return handleApiError(e);
    }
}
