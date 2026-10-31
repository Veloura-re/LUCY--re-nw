import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { purgeUnreportedMessages } from '@/lib/sanctuary-retention';

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

        const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
        const { sessionId } = body;

        if (sessionId) {
            const session = await prisma.sanctuarySession.findUnique({
                where: { id: sessionId }
            });

            if (session && (session.userAId === user.id || session.userBId === user.id)) {
                await prisma.sanctuarySession.update({
                    where: { id: session.id },
                    data: {
                        status: 'ENDED',
                        endedAt: new Date()
                    }
                });
                await purgeUnreportedMessages({ id: session.id });
            }
        } else {
            // Terminate any active or waiting sessions for this user
            await prisma.sanctuarySession.updateMany({
                where: {
                    status: { in: ['WAITING', 'ACTIVE'] },
                    OR: [
                        { userAId: user.id },
                        { userBId: user.id }
                    ]
                },
                data: {
                    status: 'ENDED',
                    endedAt: new Date()
                }
            });
            await purgeUnreportedMessages({ OR: [{ userAId: user.id }, { userBId: user.id }] });
        }

        return NextResponse.json({ success: true, message: 'Session dissolved successfully.' });

    } catch (err: any) {
        console.error('[Sanctuary End Error]:', err.message);
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Failed to end session') },
            { status: err.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
