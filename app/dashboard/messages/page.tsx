import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedUserRooms, getCachedRoomMessages } from "@/lib/services/messages";
import MessagesClientWrapper from "@/components/dashboard/messages-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { prisma } from "@/lib/prisma";
import { syncGroupMemberships, syncAllSchoolMembers } from "@/lib/messaging";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ userId?: string, chatRoomId?: string }> }) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) redirect("/login");

    const params = await searchParams;
    let dbUser = await getCachedUser(authUser.id);
    
    let schoolId = dbUser?.schoolId;
    if (!schoolId) {
        const activeSchool = await prisma.school.findFirst({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        }) || await prisma.school.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { id: true }
        });
        schoolId = activeSchool?.id;
    }

    if (!schoolId) redirect("/dashboard");

    const userId = dbUser?.id || authUser.id;
    const role = dbUser?.role || 'OWNER';

    // 1. Synchronize group memberships FIRST so school group, teacher group, & class groups exist
    await syncGroupMemberships(userId, schoolId, role as any);

    // 2. Fetch freshly synced rooms
    let rooms = await getCachedUserRooms(userId, schoolId, role);
    if (!rooms || rooms.length === 0) {
        await syncAllSchoolMembers(schoolId);
        rooms = await getCachedUserRooms(userId, schoolId, role);
    }
    
    let initialMessages: any[] = [];
    let initialNextCursor: string | null = null;
    let initialActiveRoom: any = null;

    // Pre-fetch active room messages if chatRoomId is present
    if (params.chatRoomId) {
        initialActiveRoom = rooms.find((r: any) => r.id === params.chatRoomId);
        const messageData = await getCachedRoomMessages(params.chatRoomId);
        initialMessages = messageData.messages;
        initialNextCursor = messageData.nextCursor;
    } else if (rooms.length > 0) {
        // Default to first group chat if none selected
        initialActiveRoom = rooms[0];
        const messageData = await getCachedRoomMessages(rooms[0].id);
        initialMessages = messageData.messages;
        initialNextCursor = messageData.nextCursor;
    }

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <SpringingLoader message="Synchronizing Institutional Smart Net..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Secure Connection</p>
            </div>
        }>
            <MessagesClientWrapper 
                me={{ ...authUser, id: userId, dbUser: { ...dbUser, schoolId, role } }}
                initialRooms={rooms}
                initialActiveRoom={initialActiveRoom}
                initialMessages={initialMessages}
                initialNextCursor={initialNextCursor}
                initialTargetUserId={params.userId}
            />
        </Suspense>
    );
}
