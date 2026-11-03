import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, getVerifiedUser } from '@/lib/security';
import { revalidateTag } from 'next/cache';

import { logActivity } from '@/lib/audit';
async function verifyOwner() {
    const authUser = await getVerifiedUser();
    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({ where: { id: authUser.id }});
    if (!dbUser || dbUser.role !== 'OWNER' || !dbUser.schoolId) return null;
    return dbUser;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = (await request.json().catch(() => ({}))) as any;

        // Tenant isolation: the target must be a principal of the owner's own school.
        const target = await prisma.user.findFirst({
            where: { id: resolvedParams.id, schoolId: owner.schoolId, role: 'PRINCIPAL' },
            select: { id: true, preferences: true }
        });
        if (!target) return NextResponse.json({ error: 'Principal not found' }, { status: 404 });

        if (body.action === 'DEMOTE') {
            await prisma.user.update({
                where: { id: target.id },
                data: { role: 'TEACHER' }
            });
        } else if (typeof body.fullAccess === 'boolean') {
            const user = target;
            let prefs = user?.preferences as any;
            if (typeof prefs === 'string') {
                try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
            } else if (!prefs) {
                prefs = {};
            }
            prefs.fullAccess = body.fullAccess;

            await prisma.user.update({
                where: { id: target.id },
                data: { preferences: prefs }
            });
        }
        
        try {
            revalidateTag(`school-${owner.schoolId}`, 'max');
            revalidateTag(`users-${owner.schoolId}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: owner.id, schoolId: owner.schoolId, action: body.action === 'DEMOTE' ? 'DEMOTE_PRINCIPAL' : 'UPDATE_PRINCIPAL_ACCESS', resourceType: 'principal', resourceId: target.id, ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { searchParams } = new URL(request.url);
        const isInvite = searchParams.get('type') === 'invite';

        if (isInvite) {
            const deleted = await prisma.inviteToken.deleteMany({
                where: { id: resolvedParams.id, schoolId: owner.schoolId }
            });
            if (deleted.count === 0) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
        } else {
            const targetUser = await prisma.user.findFirst({
                where: { id: resolvedParams.id, schoolId: owner.schoolId }
            });
            if (!targetUser) return NextResponse.json({ error: 'Principal not found' }, { status: 404 });
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { schoolId: null, role: 'TEACHER' }
            });
        }
        
        try {
            revalidateTag(`school-${owner.schoolId}`, 'max');
            revalidateTag(`users-${owner.schoolId}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: owner.id, schoolId: owner.schoolId, action: 'DELETE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error);
    }
}
