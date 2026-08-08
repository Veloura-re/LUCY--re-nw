import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdmin } from '@/lib/admin-auth';

// PATCH - Demote principal to TEACHER
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string, userId: string }> }) {
    const resolvedParams = await params;
    const dbUser = await verifySuperAdmin();
    if (!dbUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const isEdge = !prisma;

        if (isEdge) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const { error } = await supabase
                .from('User')
                .update({ role: 'TEACHER' })
                .eq('id', resolvedParams.userId)
                .eq('schoolId', resolvedParams.id);
            
            if (error) throw error;
        } else {
            await prisma.user.update({
                where: { id: resolvedParams.userId },
                data: { role: 'TEACHER' }
            });
        }
        
        const { revalidateTag } = require('next/cache');
        revalidateTag(`school-${resolvedParams.id}`);
        revalidateTag(`users-${resolvedParams.id}`);
        revalidateTag(`teacher-registry-${resolvedParams.id}`);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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

        const isEdge = !prisma;

        if (isEdge) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            if (isInvite) {
                const { error } = await supabase
                    .from('InviteToken')
                    .delete()
                    .eq('id', resolvedParams.userId)
                    .eq('schoolId', resolvedParams.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('User')
                    .update({ schoolId: null, role: 'TEACHER' }) // Remove from school, default role
                    .eq('id', resolvedParams.userId)
                    .eq('schoolId', resolvedParams.id);
                if (error) throw error;
            }
        } else {
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
        }
        
        const { revalidateTag } = require('next/cache');
        revalidateTag(`school-${resolvedParams.id}`);
        revalidateTag(`users-${resolvedParams.id}`);
        revalidateTag(`teacher-registry-${resolvedParams.id}`);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
