import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedTeacherClasses } from "@/lib/services/attendance";
import { getCachedSchoolSubjects } from "@/lib/services/school-curriculum";
import { getCachedClassAssignments } from "@/lib/services/assignments";
import AssignmentsTeacherConsole from "@/components/dashboard/assignments-teacher-console";
import { Suspense } from "react";
import { Brain, Activity } from "lucide-react";

export default async function TeacherAssignmentsPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Parallel Orchestration
    const [classes, subjects] = await Promise.all([
        getCachedTeacherClasses(dbUser.id, dbUser.schoolId),
        getCachedSchoolSubjects(dbUser.schoolId)
    ]);

    // Initial assignments for the first class (if any)
    const initialAssignments = classes[0]
        ? await getCachedClassAssignments(dbUser.schoolId, classes[0].classId)
        : [];

    return (
        <Suspense fallback={<AssignmentsLoadingFallback />}>
            <AssignmentsTeacherConsole 
                initialAssignments={initialAssignments}
                classes={classes}
                subjects={subjects}
            />
        </Suspense>
    );
}

function AssignmentsLoadingFallback() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border border-zinc-200 dark:border-white/5 border-t-white animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-zinc-900 dark:text-white animate-pulse" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-900 dark:text-white italic">Synchronizing Task Command</p>
                <div className="flex items-center gap-3 justify-center">
                    <div className="h-[1px] w-6 bg-zinc-200 dark:bg-zinc-800" />
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Neural Link Encryption Active</p>
                    <div className="h-[1px] w-6 bg-zinc-200 dark:bg-zinc-800" />
                </div>
            </div>
        </div>
    );
}
