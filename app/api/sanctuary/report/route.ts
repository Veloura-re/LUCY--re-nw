import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';

export async function POST(req: NextRequest) {
    try {
        const user = await requireRole([
            'STUDENT',
            'TEACHER',
            'HOMEROOM',
            'PRINCIPAL',
            'OWNER',
            'SUPERADMIN'
        ]);

        const body = (await req.json()) as { sessionId: string; reason: string };
        const { sessionId, reason } = body;

        if (!sessionId || !reason) {
            return NextResponse.json({ error: 'Missing sessionId or report reason' }, { status: 400 });
        }

        const session = await prisma.sanctuarySession.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 100
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.userAId !== user.id && session.userBId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const reportedId = session.userAId === user.id ? (session.userBId || 'UNKNOWN') : session.userAId;

        // Build transcript snapshot
        const transcript = session.messages.map(m => ({
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            content: m.content,
            timestamp: m.createdAt.toISOString()
        }));

        // 1. Create Report
        const report = await prisma.sanctuaryReport.create({
            data: {
                sessionId: session.id,
                reporterId: user.id,
                reportedId,
                reason,
                transcript: transcript as any
            }
        });

        // 2. Set Session to FLAGGED
        await prisma.sanctuarySession.update({
            where: { id: session.id },
            data: {
                status: 'FLAGGED',
                endedAt: new Date()
            }
        });

        // 3. Multi-Tenant Audit Log (Rule 2 invariant: schoolId non-null)
        const schoolId = user.schoolId || (session.userASchoolId !== 'global_node' ? session.userASchoolId : 'system_sanctuary');
        await logActivity({
            userId: user.id,
            schoolId,
            action: 'SANCTUARY_ABUSE_REPORTED',
            resourceType: 'SanctuarySession',
            resourceId: session.id,
            level: 'WARN',
            statusCode: 200,
            path: '/api/sanctuary/report',
            ip: getIp(req),
            after: { reportId: report.id, reason, reportedId }
        });

        return NextResponse.json({
            success: true,
            reportId: report.id,
            message: 'Report filed successfully. Session has been safely terminated.'
        });

    } catch (err: any) {
        console.error('[Sanctuary Report Error]:', err.message);
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Failed to submit report') },
            { status: err.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
