import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedTeacherClasses, getAttendanceMatrix } from "@/lib/services/attendance";
import AttendanceClientWrapper from "@/components/dashboard/attendance-client-wrapper";
import { Suspense } from "react";
import { Activity } from "lucide-react";

export default async function AttendancePage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Parallel Fetching for sub-second performance
    // 1. Fetch assigned classes
    const classes = await getCachedTeacherClasses(dbUser.id, dbUser.schoolId);
    
    // 2. Pre-fetch matrix for the first class assigned for today
    const firstClassId = classes[0]?.classId;
    const today = new Date().toISOString().split('T')[0];

    const initialMatrix = firstClassId 
        ? await getAttendanceMatrix(dbUser.schoolId, firstClassId, today)
        : { students: [], records: [], authorizations: [] };

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <Activity className="w-12 h-12 text-white animate-pulse" />
                <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Establishing Authority Link</p>
                    <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse italic">Neural Presence Synchronization Active</p>
                </div>
            </div>
        }>
            <AttendanceClientWrapper 
                initialClasses={classes}
                initialMatrix={initialMatrix}
                teacherId={dbUser.id}
            />
        </Suspense>
    );
}
