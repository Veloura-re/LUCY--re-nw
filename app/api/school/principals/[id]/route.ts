import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { handleApiError } from '@/lib/security';
import { revalidateTag } from 'next/cache';

async function verifyOwner() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
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

        if (body.action === 'DEMOTE') {
            await prisma.user.update({
                where: { id: resolvedParams.id },
                data: { role: 'TEACHER' }
            });
        } else if (typeof body.fullAccess === 'boolean') {
            const user = await prisma.user.findUnique({ where: { id: resolvedParams.id }});
            let prefs = user?.preferences as any;
            if (typeof prefs === 'string') {
                try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
            } else if (!prefs) {
                prefs = {};
            }
            prefs.fullAccess = body.fullAccess;

            await prisma.user.update({
                where: { id: resolvedParams.id },
                data: { preferences: prefs }
            });
        }
        
        try {
            revalidateTag(`school-${owner.schoolId}`, 'max');
            revalidateTag(`users-${owner.schoolId}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: owner.id, schoolId: owner.schoolId, action: 'UPDATE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
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
            await prisma.inviteToken.delete({
                where: { id: resolvedParams.id }
            });
        } else {
            await prisma.user.update({
                where: { id: resolvedParams.id },
                data: { schoolId: null, role: 'TEACHER' }
            });
        }
        
        try {
            revalidateTag(`school-${owner.schoolId}`, 'max');
            revalidateTag(`users-${owner.schoolId}`, 'max');
        } catch { /* non-blocking */ }

        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: owner.id, schoolId: owner.schoolId, action: 'DELETE_PRINCIPAL', resourceType: 'principal', ip: _ip || undefined });
        } catch { /* non-blocking */ }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error);
    }
}
