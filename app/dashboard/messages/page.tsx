import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedUserRooms, getCachedRoomMessages } from "@/lib/services/messages";
import MessagesClientWrapper from "@/components/dashboard/messages-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ userId?: string, chatRoomId?: string }> }) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) redirect("/login");

    const params = await searchParams;
    const dbUser = await getCachedUser(authUser.id);
    
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Use actual database user ID (dbUser.id) for room memberships
    const userId = dbUser.id || authUser.id;

    // Auto-sync group memberships (Global School, Teachers Group, Class Groups)
    const { syncGroupMemberships } = await import('@/lib/messaging');
    await syncGroupMemberships(userId, dbUser.schoolId, dbUser.role as any);

    // Fetch rooms using dbUser.id so all group memberships are matched
    const initialRoomsTask = getCachedUserRooms(userId, dbUser.schoolId, dbUser.role);
    
    let initialMessages: any[] = [];
    let initialNextCursor: string | null = null;
    let initialActiveRoom: any = null;

    // If chatRoomId is provided in URL, pre-fetch messages
    if (params.chatRoomId) {
        const [rooms, messageData] = await Promise.all([
            initialRoomsTask,
            getCachedRoomMessages(params.chatRoomId)
        ]);
        
        initialActiveRoom = rooms.find((r: any) => r.id === params.chatRoomId);
        initialMessages = messageData.messages;
        initialNextCursor = messageData.nextCursor;
    }

    const rooms = await initialRoomsTask;

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <SpringingLoader message="Synchronizing Institutional Smart Net..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Secure Connection</p>
            </div>
        }>
            <MessagesClientWrapper 
                me={{ ...authUser, id: userId, dbUser }}
                initialRooms={rooms}
                initialActiveRoom={initialActiveRoom}
                initialMessages={initialMessages}
                initialNextCursor={initialNextCursor}
                initialTargetUserId={params.userId}
            />
        </Suspense>
    );
}
