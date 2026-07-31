import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getSchoolAssignmentAnalytics, getDirectorAssignmentOversight } from "@/lib/services/assignments";
import { DirectorAssignmentHub } from "@/components/dashboard/director-assignment-hub";
import { Suspense } from "react";
import { Brain, Activity } from "lucide-react";

export default async function AssignmentsHubPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Unified Routing Logic
    switch (dbUser.role) {
        case 'PRINCIPAL':
            const [analytics, oversight] = await Promise.all([
                getSchoolAssignmentAnalytics(dbUser.schoolId),
                getDirectorAssignmentOversight(dbUser.schoolId)
            ]);

            return (
                <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                        <div>
                            <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white uppercase italic">
                                Scholastic <span className="text-eduGreen-500 not-italic">System</span>
                            </h1>
                            <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Institutional Oversight & Task Analytics</p>
                        </div>
                    </div>
                    
                    <Suspense fallback={<HubLoadingFallback />}>
                        <DirectorAssignmentHub 
                            analytics={analytics} 
                            oversight={oversight} 
                        />
                    </Suspense>
                </div>
            );

        case 'HOMEROOM':
        case 'TEACHER':
            redirect("/dashboard/teacher/assignments");

        case 'STUDENT':
            redirect("/dashboard/student/assignments");

        case 'PARENT': {
            const { getFamilyChildren } = await import("@/lib/dashboard-data");
            const children = await getFamilyChildren(dbUser.id);
            if (children && children.length > 0) {
                redirect(`/dashboard/parent/homework?studentId=${children[0].id}`);
            }
            redirect("/dashboard");
        }

        default:
            redirect("/dashboard");
    }
}

function HubLoadingFallback() {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border border-zinc-200 dark:border-white/5 border-t-white animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-zinc-900 dark:text-white animate-pulse" />
                </div>
            </div>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-600 italic">Synchronizing Institutional Node...</p>
        </div>
    );
}
