import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';

export async function POST(req: NextRequest) {
    try {
        const user = await requireRole(['SUPERADMIN']);

        const body = (await req.json()) as {
            reportId?: string;
            sessionId: string;
            action: 'DISMISS_REPORT' | 'TERMINATE_SESSION' | 'FLAG_SESSION' | 'ESCALATE_TO_COUNSELOR';
            resolutionNotes?: string;
        };

        const { reportId, sessionId, action, resolutionNotes } = body;

        if (!sessionId || !action) {
            return NextResponse.json({ error: 'sessionId and action are required' }, { status: 400 });
        }

        const session = await prisma.sanctuarySession.findUnique({
            where: { id: sessionId },
            include: { reports: true }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Campus authorization check for OWNER / PRINCIPAL
        if (user.role !== 'SUPERADMIN') {
            if (user.schoolId && session.userASchoolId !== user.schoolId && session.userBSchoolId !== user.schoolId) {
                return NextResponse.json({ error: 'Access denied: session outside campus jurisdiction' }, { status: 403 });
            }
        }

        const targetSchoolId = session.userASchoolId || user.schoolId || 'GLOBAL';
        let updatedSession = session;

        if (action === 'TERMINATE_SESSION') {
            updatedSession = await prisma.sanctuarySession.update({
                where: { id: sessionId },
                data: {
                    status: 'ENDED',
                    endedAt: new Date()
                },
                include: { reports: true }
            });
        } else if (action === 'FLAG_SESSION' || action === 'ESCALATE_TO_COUNSELOR') {
            updatedSession = await prisma.sanctuarySession.update({
                where: { id: sessionId },
                data: { status: 'FLAGGED' },
                include: { reports: true }
            });
        }

        if (reportId && action === 'DISMISS_REPORT') {
            await prisma.sanctuaryReport.delete({
                where: { id: reportId }
            }).catch(() => {});
        }

        // Rule 2 Invariant: Audit logging with non-null schoolId
        await logActivity({
            userId: user.id,
            schoolId: targetSchoolId,
            action: `SANCTUARY_MODERATION_${action}`,
            resourceType: 'SanctuarySession',
            resourceId: sessionId,
            level: action === 'TERMINATE_SESSION' || action === 'ESCALATE_TO_COUNSELOR' ? 'WARN' : 'INFO',
            path: '/api/sanctuary/moderation/action',
            before: { status: session.status },
            after: { 
                status: updatedSession.status, 
                action, 
                resolutionNotes: resolutionNotes || 'Executed via moderation console' 
            },
            ip: getIp(req),
            userAgent: req.headers.get('user-agent') || undefined
        });

        return NextResponse.json({
            success: true,
            message: `Action ${action} executed successfully`,
            session: {
                id: updatedSession.id,
                status: updatedSession.status
            }
        });

    } catch (err: any) {
        console.error('[Sanctuary Moderation Action Error]:', err.message);
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Action execution failure') },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
