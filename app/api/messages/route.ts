import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, secureJson } from '@/lib/security';

import { getCachedRoomMessages } from '@/lib/services/messages';

export async function GET(request: Request) {
    try {
        const authUser = await requireAuth();

        const { searchParams } = new URL(request.url);
        const chatRoomId = searchParams.get('chatRoomId');
        const cursor = searchParams.get('cursor') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!chatRoomId) {
            return NextResponse.json({ error: 'Chat Room ID is required' }, { status: 400 });
        }

        // Verify membership
        const membership = await prisma.chatRoomMember.findUnique({
            where: { chatRoomId_userId: { chatRoomId, userId: authUser.id } }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Forbidden: You are not a member of this room' }, { status: 403 });
        }

        // Fetch using the optimized cached service
        const data = await getCachedRoomMessages(chatRoomId, cursor, limit);

        return secureJson(data);
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const authUser = await requireAuth();
        const { chatRoomId, content, attachments } = await request.json();

        if (!chatRoomId || (!content && !attachments)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify membership and fetch room/school context
        const membership = await prisma.chatRoomMember.findUnique({
            where: { chatRoomId_userId: { chatRoomId, userId: authUser.id } },
            include: { chatRoom: true }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Specific Restrictions for existing rooms
        if (membership.chatRoom.type === 'PRIVATE') {
            const partner = await prisma.chatRoomMember.findFirst({
                where: { chatRoomId, userId: { not: authUser.id } },
                include: { user: true }
            });

            if (partner?.user) {
                if (authUser.user_metadata?.role === 'STUDENT' && partner.user.role === 'STUDENT') {
                    return NextResponse.json({ error: 'thisis restricted on student mode' }, { status: 403 });
                }
                if (authUser.user_metadata?.role === 'PARENT' && (partner.user.role === 'STUDENT' || partner.user.role === 'PARENT')) {
                    return NextResponse.json({ error: 'thisis restricted on parent mode' }, { status: 403 });
                }
            }
        }

        const message = await prisma.message.create({
            data: {
                chatRoomId,
                fromUserId: authUser.id,
                schoolId: membership.chatRoom.schoolId,
                content: content || '',
                attachments: attachments || null
            },
            include: {
                fromUser: {
                    select: { id: true, name: true, role: true }
                }
            }
        });

        // Update room's updatedAt for sorting
        await prisma.chatRoom.update({
            where: { id: chatRoomId },
            data: { updatedAt: new Date() }
        });

        // --- EMAIL ALERTS LOGIC ---
        try {
            // Find other members of this room
            const otherMembers = await prisma.chatRoomMember.findMany({
                where: { chatRoomId, userId: { not: authUser.id } },
                include: { user: { select: { email: true, name: true, preferences: true } } }
            });

            // Dynamically import to avoid edge runtime issues if any
            const { sendEmail } = await import('@/lib/email');

            for (const member of otherMembers) {
                if (!member.user.email) continue;
                const prefs = member.user.preferences as any;
                // Only send if explicitly enabled (default is false if not set in preferences, or whatever user checked)
                // Actually, let's assume it's true unless explicitly set to false if we want it to be aggressive,
                // but the UI sets it, so we check if emailAlerts is exactly true.
                if (prefs?.emailAlerts === true) {
                    await sendEmail({
                        to: member.user.email,
                        subject: `New Secure Message from ${authUser.user_metadata?.name || 'LUCY ACADEMIA'}`,
                        html: `
                            <div style="font-family: sans-serif; color: #111; max-w-2xl mx-auto border: 1px solid #eaeaea; border-radius: 8px; padding: 24px;">
                                <h2 style="color: #147A52;">Neural Uplink Received</h2>
                                <p>You have a new message from <strong>${authUser.user_metadata?.name || 'System'}</strong>:</p>
                                <blockquote style="border-left: 4px solid #3BD68D; padding-left: 16px; color: #444; font-style: italic; background: #f9f9f9; padding: 12px; border-radius: 4px;">
                                    ${content || '<i>[Attachment]</i>'}
                                </blockquote>
                                <p style="margin-top: 32px;">
                                    <a href="https://www.5-cn.net/dashboard/messages?chatRoomId=${chatRoomId}" style="background-color: #147A52; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in LUCY ACADEMIA</a>
                                </p>
                                <p style="font-size: 12px; color: #888; margin-top: 48px;">
                                    You are receiving this because Email Alerts are enabled in your App Experience settings.
                                </p>
                            </div>
                        `
                    });
                }
            }
        } catch (emailErr) {
            console.error('Failed to send email alerts:', emailErr);
        }

        return secureJson({ message });
    } catch (e) {
        return handleApiError(e);
    }
}
