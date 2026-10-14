import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { syncAllSchoolMembers } from '@/lib/messaging';
import { withAudit } from '@/lib/with-audit';

// POST /api/school/sync-groups — Bulk sync all users into their correct groups
async function handlePOST(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        await syncAllSchoolMembers(user.schoolId);

        return NextResponse.json({ success: true, message: 'All school members synced into group chats.' });
    } catch (e: any) {
        console.error('Group sync failed:', e);
        return NextResponse.json({ error: publicErrorMessage(e, 'Sync failed') }, { status: 500 });
    }
}

export const POST = withAudit(handlePOST, { action: 'SYNC_CHAT_GROUPS', resourceType: 'chat_group' });
