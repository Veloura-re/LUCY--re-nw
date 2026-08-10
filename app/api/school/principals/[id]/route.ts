import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createClient as createEdgeClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

async function verifyOwner() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    if (prisma) {
        const dbUser = await prisma.user.findUnique({ where: { id: authUser.id }});
        if (!dbUser || dbUser.role !== 'OWNER' || !dbUser.schoolId) return null;
        return dbUser;
    } else {
        const edgeSupabase = createEdgeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: dbUser } = await edgeSupabase.from('User').select('*').eq('id', authUser.id).single();
        if (!dbUser || dbUser.role !== 'OWNER' || !dbUser.schoolId) return null;
        return dbUser;
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json() as any;
        const isEdge = !prisma;

        if (body.action === 'DEMOTE') {
            if (isEdge) {
                const supabase = createEdgeClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                const { error } = await supabase
                    .from('User')
                    .update({ role: 'TEACHER' })
                    .eq('id', resolvedParams.id)
                    .eq('schoolId', owner.schoolId);
                if (error) throw error;
            } else {
                await prisma.user.update({
                    where: { id: resolvedParams.id },
                    data: { role: 'TEACHER' }
                });
            }
        } else if (typeof body.fullAccess === 'boolean') {
            if (isEdge) {
                const supabase = createEdgeClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                
                // Get existing preferences
                const { data: user } = await supabase.from('User').select('preferences').eq('id', resolvedParams.id).single();
                let prefs = user?.preferences;
                if (typeof prefs === 'string') {
                    try { prefs = JSON.parse(prefs); } catch (e) { prefs = {}; }
                } else if (!prefs) {
                    prefs = {};
                }
                prefs.fullAccess = body.fullAccess;

                const { error } = await supabase
                    .from('User')
                    .update({ preferences: prefs })
                    .eq('id', resolvedParams.id)
                    .eq('schoolId', owner.schoolId);
                if (error) throw error;
            } else {
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
        }
        
        revalidateTag(`school-${owner.schoolId}`);
        revalidateTag(`users-${owner.schoolId}`);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = undefined; // verifyOwner scoped
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPDATE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const owner = await verifyOwner();
    if (!owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const { searchParams } = new URL(request.url);
        const isInvite = searchParams.get('type') === 'invite';
        const isEdge = !prisma;

        if (isEdge) {
            const supabase = createEdgeClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            if (isInvite) {
                const { error } = await supabase
                    .from('InviteToken')
                    .delete()
                    .eq('id', resolvedParams.id)
                    .eq('schoolId', owner.schoolId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('User')
                    .update({ schoolId: null, role: 'TEACHER' })
                    .eq('id', resolvedParams.id)
                    .eq('schoolId', owner.schoolId);
                if (error) throw error;
            }
        } else {
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
        }
        
        revalidateTag(`school-${owner.schoolId}`);
        revalidateTag(`users-${owner.schoolId}`);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = undefined; // verifyOwner scoped
            if (_userId) {
                await logActivity({ userId: _userId, action: 'DELETE', resourceType: 'principal', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
