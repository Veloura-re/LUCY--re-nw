import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedStructuredRooms, getCachedRoomMessages } from "@/lib/services/messages";
import MessagesClientWrapper from "@/components/dashboard/messages-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { prisma } from "@/lib/prisma";

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

    // Fetch structured institutional rooms
    const structured = await getCachedStructuredRooms(userId, schoolId, role);
    const rooms = structured.allRooms;
    
    let initialMessages: any[] = [];
    let initialNextCursor: string | null = null;
    let initialActiveRoom: any = null;

    if (params.chatRoomId) {
        initialActiveRoom = rooms.find((r: any) => r.id === params.chatRoomId);
        if (initialActiveRoom) {
            const messageData = await getCachedRoomMessages(params.chatRoomId);
            initialMessages = messageData.messages;
            initialNextCursor = messageData.nextCursor;
        }
    } 
    
    if (!initialActiveRoom && rooms.length > 0) {
        // Prefer #announcements or first campus channel
        initialActiveRoom = structured.campusChannels[0] || rooms[0];
        const messageData = await getCachedRoomMessages(initialActiveRoom.id);
        initialMessages = messageData.messages;
        initialNextCursor = messageData.nextCursor;
    }

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <SpringingLoader message="Synchronizing Institutional Comms..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Campus Uplink</p>
            </div>
        }>
            <MessagesClientWrapper 
                me={{ ...authUser, id: userId, dbUser: { ...dbUser, schoolId, role } }}
                initialRooms={rooms}
                initialCampusChannels={structured.campusChannels}
                initialClassCohorts={structured.classCohorts}
                initialDirectChats={structured.directChats}
                initialActiveRoom={initialActiveRoom}
                initialMessages={initialMessages}
                initialNextCursor={initialNextCursor}
                initialTargetUserId={params.userId}
            />
        </Suspense>
    );
}
