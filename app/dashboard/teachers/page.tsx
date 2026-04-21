import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedTeacherRegistry, getCachedSchoolInfoForRegistry } from "@/lib/services/teachers";
import TeachersClientWrapper from "@/components/dashboard/teachers-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default async function TeachersPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(authUser.id);
    } catch (e) {
        console.error('[TeachersPage] Failed to fetch profile:', e);
    }

    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    let teachers: any[] = [];
    let schoolInfo: any = null;

    try {
        // Sequential fetch ensures we don't burst CPU limits during cold start DB initialization
        teachers = await getCachedTeacherRegistry(dbUser.schoolId);
        schoolInfo = await getCachedSchoolInfoForRegistry(dbUser.schoolId);
    } catch (e) {
        console.error('[TeachersPage] Sequence fetch error:', e);
    }

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <SpringingLoader message="Synthesizing Faculty Personnel Profiles..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Secure Uplink</p>
            </div>
        }>
            <TeachersClientWrapper 
                initialTeachers={teachers || []}
                schoolInfo={schoolInfo}
                me={authUser}
            />
        </Suspense>
    );
}
