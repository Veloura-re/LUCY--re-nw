import { publicErrorMessage } from '@/lib/security';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';
import { revalidateTag } from 'next/cache';
import { reportServerError } from '@/lib/error-capture';

import { logActivity } from '@/lib/audit';
// PATCH - Demote principal to TEACHER
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        await prisma.user.update({
            where: { id: resolvedParams.userId },
            data: { role: 'TEACHER' }
        });
        
        try {
            revalidateTag(`school-${resolvedParams.id}`, 'max');
            revalidateTag(`users-${resolvedParams.id}`, 'max');
            revalidateTag(`teacher-registry-${resolvedParams.id}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: resolvedParams.id, action: 'DEMOTE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
}

// DELETE - Unlink user from school completely (for active users) OR Delete invite (for pending invites)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { searchParams } = new URL(request.url);
        const isInvite = searchParams.get('type') === 'invite';

        if (isInvite) {
            await prisma.inviteToken.delete({
                where: { id: resolvedParams.userId }
            });
        } else {
            await prisma.user.update({
                where: { id: resolvedParams.userId },
                data: { schoolId: null, role: 'TEACHER' }
            });
        }
        
        try {
            revalidateTag(`school-${resolvedParams.id}`, 'max');
            revalidateTag(`users-${resolvedParams.id}`, 'max');
            revalidateTag(`teacher-registry-${resolvedParams.id}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            if (dbUser?.id) {
                await logActivity({ userId: dbUser.id, schoolId: resolvedParams.id, action: 'DELETE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
    }
}
