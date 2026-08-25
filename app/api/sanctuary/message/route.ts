import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/security';
import { sanitizeSanctuaryContent } from '@/lib/sanctuary-guardrails';

export async function GET(req: NextRequest) {
    try {
        const user = await requireRole([
            'STUDENT',
            'TEACHER',
            'HOMEROOM',
            'PRINCIPAL',
            'OWNER',
            'SUPERADMIN'
        ]);

        const url = new URL(req.url);
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId parameter required' }, { status: 400 });
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

        // Verify membership
        if (session.userAId !== user.id && session.userBId !== user.id) {
            return NextResponse.json({ error: 'Access denied: not a member of this session' }, { status: 403 });
        }

        const isUserA = session.userAId === user.id;

        return NextResponse.json({
            session: {
                id: session.id,
                mode: session.mode,
                status: session.status,
                myPseudo: isUserA ? session.userAPseudo : session.userBPseudo,
                myRole: isUserA ? session.userARole : session.userBRole,
                partnerPseudo: isUserA ? session.userBPseudo : session.userAPseudo,
                partnerRole: isUserA ? session.userBRole : session.userARole,
                createdAt: session.createdAt
            },
            messages: session.messages.map(m => ({
                id: m.id,
                senderName: m.senderName,
                senderRole: m.senderRole,
                content: m.content,
                isMe: m.senderId === user.id,
                createdAt: m.createdAt
            }))
        });

    } catch (err: any) {
        console.error('[Sanctuary Message Fetch Error]:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal failure' },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

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

        const body = (await req.json()) as { sessionId: string; content: string };
        const { sessionId, content } = body;

        if (!sessionId || !content || !content.trim()) {
            return NextResponse.json({ error: 'Invalid message payload' }, { status: 400 });
        }

        const session = await prisma.sanctuarySession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Session is no longer active' }, { status: 400 });
        }

        // Verify membership
        if (session.userAId !== user.id && session.userBId !== user.id) {
            return NextResponse.json({ error: 'Access denied: not a member of this session' }, { status: 403 });
        }

        const isUserA = session.userAId === user.id;
        const myPseudo = (isUserA ? session.userAPseudo : session.userBPseudo) || 'Anonymous';

        // Run through Real-Time Guardrail Content Filter
        const safetyResult = sanitizeSanctuaryContent(content);

        const savedMessage = await prisma.sanctuaryMessage.create({
            data: {
                sessionId: session.id,
                senderId: user.id,
                senderName: myPseudo,
                senderRole: user.role,
                content: safetyResult.sanitizedContent
            }
        });

        return NextResponse.json({
            success: true,
            message: {
                id: savedMessage.id,
                senderName: savedMessage.senderName,
                senderRole: savedMessage.senderRole,
                content: savedMessage.content,
                isMe: true,
                createdAt: savedMessage.createdAt
            },
            safety: {
                hasRedactions: safetyResult.hasRedactions,
                isCrisisDetected: safetyResult.isCrisisDetected,
                crisisHelpline: safetyResult.crisisHelpline
            }
        });

    } catch (err: any) {
        console.error('[Sanctuary Message Send Error]:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal transmission failure' },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
