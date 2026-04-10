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

    // Parallelize room fetching and active conversation loading
    const initialRoomsTask = getCachedUserRooms(authUser.id, dbUser.schoolId, dbUser.role);
    
    let initialMessages: any[] = [];
    let initialNextCursor: string | null = null;
    let initialActiveRoom: any = null;

    // If chatRoomId is provided in URL, pre-fetch messages for sub-second delivery
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
                <SpringingLoader message="Synchronizing Institutional Neural Net..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Secure Uplink</p>
            </div>
        }>
            <MessagesClientWrapper 
                me={authUser}
                initialRooms={rooms}
                initialActiveRoom={initialActiveRoom}
                initialMessages={initialMessages}
                initialNextCursor={initialNextCursor}
            />
        </Suspense>
    );
}
