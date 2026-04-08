import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';

export async function DELETE(request: Request) {
    try {
        const dbUser = await requireRole(['PRINCIPAL']);

        const { email } = await request.json();

        if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

        // Try to delete invite first
        const deletedInvite = await prisma.inviteToken.deleteMany({
            where: {
                email: email,
                schoolId: dbUser.schoolId
            }
        });

        // If no invite found, check if it's an active user and unlink/delete them? 
        // For now, let's just handle invites and maybe unlink teachers from school.
        // Unlinking user:
        if (deletedInvite.count === 0) {
            const teacher = await prisma.user.findFirst({
                where: { email: email, schoolId: dbUser.schoolId }
            });

            if (teacher) {
                await prisma.user.update({
                    where: { id: teacher.id },
                    data: { schoolId: null }
                });
            }
        }

        // Log Activity
        await logActivity({
            userId: dbUser.id,
            action: 'DELETE_STAFF_OR_INVITE',
            resourceType: 'USER/INVITE',
            resourceId: email,
            before: { email }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return handleApiError(e);
    }
}
