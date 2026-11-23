
import { createClient } from "@/utils/supabase/server";
import { getCachedUser } from "@/lib/users";
import { DirectorView } from "@/components/dashboard/director-view";
import { OwnerView } from "@/components/dashboard/owner-view";
import { ParentView } from "@/components/dashboard/parent-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { StudentView } from "@/components/dashboard/student-view";
import { redirect, unstable_rethrow } from "next/navigation";
import { getFamilyChildren, getSchoolAnalytics, getTeacherDashboardData } from "@/lib/dashboard-data";
import { Suspense } from "react";
import Loading from "./loading";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const dbUser = await getCachedUser(user.id);

    if (!dbUser) return <div>User profile synchronization in progress...</div>;

    if (dbUser.role === 'SUPERADMIN') {
        // Superadmin operates exclusively via the isolated admin portal
        redirect('/dashboard');
    }

    // Wrap views in Suspense to allow layout to stream
    return (
        <Suspense fallback={<Loading />}>
            <DashboardContent dbUser={JSON.parse(JSON.stringify(dbUser))} />
        </Suspense>
    );
}

async function DashboardContent({ dbUser }: { dbUser: any }) {
    let dashboardData: any = null;

    try {
        switch (dbUser.role) {
            case 'OWNER':
                if (dbUser.schoolId) {
                    try {
                        dashboardData = await getSchoolAnalytics(dbUser.schoolId);
                    } catch (e) {
                        console.error('[DashboardPage] Analytics fetch error:', e);
                    }
                }
                return <OwnerView user={dbUser} school={dbUser.school} initialAnalytics={dashboardData ? JSON.parse(JSON.stringify(dashboardData)) : null} />;

            case 'PRINCIPAL':
                if (dbUser.schoolId) {
                    try {
                        dashboardData = await getSchoolAnalytics(dbUser.schoolId);
                    } catch (e) {
                        console.error('[DashboardPage] Principal analytics fetch error:', e);
                    }
                }
                return <DirectorView user={dbUser} school={dbUser.school} initialAnalytics={dashboardData ? JSON.parse(JSON.stringify(dashboardData)) : null} />;

            case 'HOMEROOM':
            case 'TEACHER':
                try {
                    dashboardData = await getTeacherDashboardData(dbUser.id);
                } catch (e) {
                    console.error('[DashboardPage] Teacher data fetch error:', e);
                }
                return <TeacherView user={dbUser} initialData={dashboardData ? JSON.parse(JSON.stringify(dashboardData)) : { classes: [], exams: [], isClockedIn: false, attendanceSummary: [] }} />;

            case 'PARENT':
                try {
                    dashboardData = await getFamilyChildren(dbUser.id);
                } catch (e) {
                    console.error('[DashboardPage] Parent children data fetch error:', e);
                }
                return <ParentView user={dbUser} childrenData={dashboardData ? JSON.parse(JSON.stringify(dashboardData)) : []} />;

            case 'STUDENT':
                redirect('/dashboard/student');

            // Staff added by a director land directly on the area they run.
            case 'ACCOUNTANT':
                redirect('/dashboard/finance');

            case 'RECORDER':
                redirect('/dashboard/students');

            default:
                return <div className="p-20 text-center font-medium uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Operational Role Not Discovered</div>;
        }
    } catch (err) {
        // redirect() works by throwing; it must reach Next.js instead of becoming the fallback below.
        unstable_rethrow(err);
        console.error('[DashboardContent] Rendering fallback caught:', err);
        return (
            <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                <p className="text-xs uppercase tracking-widest font-mono">Institutional telemetry active. Synchronizing workspace...</p>
            </div>
        );
    }
}


