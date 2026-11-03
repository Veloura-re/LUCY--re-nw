import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, publicErrorMessage, clientDataError } from '@/lib/security';
import { generateSanctuaryPseudonym } from '@/lib/sanctuary-guardrails';
import type { SanctuaryMode } from '@prisma/client';

/**
 * Lightweight status polling for an ongoing matchmaking queue
 */
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
            // Check if user is in any active session
            const activeSession = await prisma.sanctuarySession.findFirst({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        { userAId: user.id },
                        { userBId: user.id }
                    ]
                },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: 50
                    }
                }
            });

            if (activeSession) {
                const isUserA = activeSession.userAId === user.id;
                return NextResponse.json({
                    matched: true,
                    session: {
                        id: activeSession.id,
                        mode: activeSession.mode,
                        status: activeSession.status,
                        myPseudo: isUserA ? activeSession.userAPseudo : activeSession.userBPseudo,
                        myRole: isUserA ? activeSession.userARole : activeSession.userBRole,
                        partnerPseudo: isUserA ? activeSession.userBPseudo : activeSession.userAPseudo,
                        partnerRole: isUserA ? activeSession.userBRole : activeSession.userARole,
                        createdAt: activeSession.createdAt
                    },
                    messages: activeSession.messages.map(m => ({
                        id: m.id,
                        senderName: m.senderName,
                        senderRole: m.senderRole,
                        content: m.content,
                        isMe: m.senderId === user.id,
                        createdAt: m.createdAt
                    }))
                });
            }

            return NextResponse.json({ matched: false, status: 'IDLE' });
        }

        const session = await prisma.sanctuarySession.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50
                }
            }
        });

        if (!session) {
            return NextResponse.json({ matched: false, status: 'IDLE' });
        }

        if (session.status === 'ACTIVE') {
            const isUserA = session.userAId === user.id;
            return NextResponse.json({
                matched: true,
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
        }

        return NextResponse.json({
            matched: false,
            status: session.status,
            sessionId: session.id
        });

    } catch (err: any) {
        { const bad = clientDataError(err); if (bad) return bad; }
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Polling error') },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}

/**
 * Initiates Matchmaking (Called once per user search action)
 */
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

        const body = (await req.json().catch(() => ({}))) as { mode?: SanctuaryMode };
        const mode: SanctuaryMode = body.mode === 'FACULTY_MENTOR' ? 'FACULTY_MENTOR' : 'PEER_TO_PEER';

        // Gating for Students: Ensure student is in Grades 7 to 12 if student record is present
        if (user.role === 'STUDENT') {
            const studentRecord = await prisma.student.findFirst({
                where: {
                    OR: [
                        { userId: user.id },
                        { email: user.email || '' }
                    ]
                },
                include: { grade: true }
            });

            if (studentRecord && studentRecord.grade) {
                const gradeLevel = studentRecord.grade.level;
                if (gradeLevel > 0 && (gradeLevel < 7 || gradeLevel > 12)) {
                    return NextResponse.json(
                        { error: 'The Sanctuary network is reserved for junior and senior secondary scholars (Grades 7-12).' },
                        { status: 403 }
                    );
                }
            }
        }

        // Non-students cannot participate in Peer-to-Peer mode
        if (mode === 'PEER_TO_PEER' && user.role !== 'STUDENT') {
            return NextResponse.json(
                { error: 'Peer-to-Peer mode is reserved exclusively for students. Educators may join via Faculty Mentor mode.' },
                { status: 403 }
            );
        }

        // 1. Check if user is already inside an ACTIVE session
        const existingActive = await prisma.sanctuarySession.findFirst({
            where: {
                status: 'ACTIVE',
                OR: [
                    { userAId: user.id },
                    { userBId: user.id }
                ]
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50
                }
            }
        });

        if (existingActive) {
            const isUserA = existingActive.userAId === user.id;
            return NextResponse.json({
                matched: true,
                session: {
                    id: existingActive.id,
                    mode: existingActive.mode,
                    status: existingActive.status,
                    myPseudo: isUserA ? existingActive.userAPseudo : existingActive.userBPseudo,
                    myRole: isUserA ? existingActive.userARole : existingActive.userBRole,
                    partnerPseudo: isUserA ? existingActive.userBPseudo : existingActive.userAPseudo,
                    partnerRole: isUserA ? existingActive.userBRole : existingActive.userARole,
                    createdAt: existingActive.createdAt
                },
                messages: existingActive.messages.map(m => ({
                    id: m.id,
                    senderName: m.senderName,
                    senderRole: m.senderRole,
                    content: m.content,
                    isMe: m.senderId === user.id,
                    createdAt: m.createdAt
                }))
            });
        }

        // 2. Check if user already has an active WAITING queue node
        const existingWaiting = await prisma.sanctuarySession.findFirst({
            where: {
                status: 'WAITING',
                userAId: user.id,
                mode
            }
        });

        // 3. Attempt to pair with an existing WAITING partner
        let candidateSession = null;

        if (mode === 'PEER_TO_PEER') {
            candidateSession = await prisma.sanctuarySession.findFirst({
                where: {
                    mode: 'PEER_TO_PEER',
                    status: 'WAITING',
                    userAId: { not: user.id }
                },
                orderBy: { createdAt: 'asc' }
            });
        } else {
            if (user.role === 'STUDENT') {
                candidateSession = await prisma.sanctuarySession.findFirst({
                    where: {
                        mode: 'FACULTY_MENTOR',
                        status: 'WAITING',
                        userAId: { not: user.id },
                        userARole: { in: ['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'OWNER', 'SUPERADMIN'] }
                    },
                    orderBy: { createdAt: 'asc' }
                });
            } else {
                candidateSession = await prisma.sanctuarySession.findFirst({
                    where: {
                        mode: 'FACULTY_MENTOR',
                        status: 'WAITING',
                        userAId: { not: user.id },
                        userARole: 'STUDENT'
                    },
                    orderBy: { createdAt: 'asc' }
                });
            }
        }

        // 4. Atomic Claim if Candidate Found
        if (candidateSession) {
            const myPseudo = generateSanctuaryPseudonym(user.role);
            const updated = await prisma.sanctuarySession.update({
                where: { id: candidateSession.id },
                data: {
                    status: 'ACTIVE',
                    userBId: user.id,
                    userBSchoolId: user.schoolId || 'global_node',
                    userBRole: user.role,
                    userBPseudo: myPseudo
                }
            });

            return NextResponse.json({
                matched: true,
                session: {
                    id: updated.id,
                    mode: updated.mode,
                    status: updated.status,
                    myPseudo: updated.userBPseudo,
                    myRole: updated.userBRole,
                    partnerPseudo: updated.userAPseudo,
                    partnerRole: updated.userARole,
                    createdAt: updated.createdAt
                },
                messages: []
            });
        }

        // 5. If no partner found, maintain or create WAITING node
        if (existingWaiting) {
            return NextResponse.json({
                matched: false,
                status: 'WAITING',
                sessionId: existingWaiting.id,
                message: 'Searching for available partner...'
            });
        }

        const newPseudo = generateSanctuaryPseudonym(user.role);
        const newQueueNode = await prisma.sanctuarySession.create({
            data: {
                mode,
                status: 'WAITING',
                userAId: user.id,
                userASchoolId: user.schoolId || 'global_node',
                userARole: user.role,
                userAPseudo: newPseudo
            }
        });

        return NextResponse.json({
            matched: false,
            status: 'WAITING',
            sessionId: newQueueNode.id,
            message: 'Queued for matchmaking.'
        });

    } catch (err: any) {
        { const bad = clientDataError(err); if (bad) return bad; }
        console.error('[Sanctuary Match Error]:', err.message);
        return NextResponse.json(
            { error: publicErrorMessage(err, 'Internal matchmaking failure') },
            { status: err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
