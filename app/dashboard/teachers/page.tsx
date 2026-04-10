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

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Parallel Fetching for sub-second performance
    const [teachers, schoolInfo] = await Promise.all([
        getCachedTeacherRegistry(dbUser.schoolId),
        getCachedSchoolInfoForRegistry(dbUser.schoolId)
    ]);

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <SpringingLoader message="Synthesizing Faculty Personnel Profiles..." />
                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest animate-pulse">Establishing Secure Uplink</p>
            </div>
        }>
            <TeachersClientWrapper 
                initialTeachers={teachers}
                schoolInfo={schoolInfo}
                me={authUser}
            />
        </Suspense>
    );
}
