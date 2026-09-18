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
        const { targetUserId }: any = await request.json().catch(() => ({}));

        if (targetUserId) {
            // Find target user by ID, email, or linked student
            let targetUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { id: targetUserId },
                        { email: targetUserId }
                    ]
                }
            });

            if (!targetUser) {
                // Check if targetUserId is a Student ID
                const student = await prisma.student.findUnique({
                    where: { id: targetUserId },
                    include: { user: true, parentLinks: { include: { parent: true } } }
                });
                if (student) {
                    if (student.user) {
                        targetUser = student.user;
                    } else if (student.parentLinks?.[0]?.parent) {
                        targetUser = student.parentLinks[0].parent;
                    }
                }
            }

            if (!targetUser) {
                return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
            }

            // Cross-tenant membership verification
            if (!targetUser.schoolId) {
                const isLinked = await prisma.parentStudentLink.findFirst({
                    where: {
                        parentId: targetUser.id,
                        student: { schoolId: dbUser.schoolId }
                    }
                });
                if (!isLinked && dbUser.role !== 'SUPERADMIN') {
                    return NextResponse.json({ error: 'Target user not found in your school' }, { status: 404 });
                }
            } else if (targetUser.schoolId !== dbUser.schoolId) {
                // If it's a parent, check if their child goes to this school
                const isParentOfSchoolStudent = await prisma.parentStudentLink.findFirst({
                    where: {
                        parentId: targetUser.id,
                        student: { schoolId: dbUser.schoolId }
                    }
                });
                if (!isParentOfSchoolStudent && dbUser.role !== 'SUPERADMIN') {
                    return NextResponse.json({ error: 'Target user not found in your school' }, { status: 404 });
                }
            }

            // DM role guardrails:
            // Students can only DM teachers/staff - not other students
            if (dbUser.role === 'STUDENT' && targetUser.role === 'STUDENT') {
                return NextResponse.json({ error: 'Direct transmission restricted on student mode' }, { status: 403 });
            }
            // Parents can only DM teachers/staff or principals - not other parents
            if (dbUser.role === 'PARENT' && targetUser.role === 'PARENT') {
                return NextResponse.json({ error: 'Parent-to-parent direct messaging is not permitted' }, { status: 403 });
            }
            // Students cannot DM users from other schools (checked above)

            const room = await getOrCreateDirectRoom(dbUser.schoolId, dbUser.id, targetUser.id);
            return NextResponse.json({ room });
        }

        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    } catch (e) {
        return handleApiError(e);
    }
}
