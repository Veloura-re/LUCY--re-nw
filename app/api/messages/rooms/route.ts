import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { getStructuredSchoolRooms, getOrCreateDirectRoom, ensureDbUser } from '@/lib/messaging';

export async function GET(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();

        // Fetch structured channels & direct chats
        const structured = await getStructuredSchoolRooms(dbUser.id, dbUser.schoolId, dbUser.role);

        return NextResponse.json({
            rooms: structured.allRooms,
            campusChannels: structured.campusChannels,
            classCohorts: structured.classCohorts,
            directChats: structured.directChats
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        const { targetUserId } = await request.json();

        if (targetUserId) {
            // Find target user
            const targetUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { id: targetUserId },
                        { email: targetUserId }
                    ]
                }
            });

            if (!targetUser || (targetUser.schoolId && targetUser.schoolId !== dbUser.schoolId)) {
                return NextResponse.json({ error: 'Target user not found in your school' }, { status: 404 });
            }

            // Role guardrails
            if (dbUser.role === 'STUDENT' && targetUser.role === 'STUDENT') {
                return NextResponse.json({ error: 'Direct transmission restricted on student mode' }, { status: 403 });
            }

            const room = await getOrCreateDirectRoom(dbUser.schoolId, dbUser.id, targetUser.id);
            return NextResponse.json({ room });
        }

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}
