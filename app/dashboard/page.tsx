
import { createClient } from "@/utils/supabase/server";
import { getCachedUser } from "@/lib/users";
import { DirectorView } from "@/components/dashboard/director-view";
import { OwnerView } from "@/components/dashboard/owner-view";
import { ParentView } from "@/components/dashboard/parent-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { StudentView } from "@/components/dashboard/student-view";
import { redirect } from "next/navigation";
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
        redirect('/admin/dashboard');
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

    switch (dbUser.role) {
        case 'OWNER':
            if (dbUser.schoolId) {
                dashboardData = await getSchoolAnalytics(dbUser.schoolId);
            }
            return <OwnerView user={dbUser} school={dbUser.school} initialAnalytics={JSON.parse(JSON.stringify(dashboardData))} />;

        case 'PRINCIPAL':
            if (dbUser.schoolId) {
                dashboardData = await getSchoolAnalytics(dbUser.schoolId);
            }
            return <DirectorView user={dbUser} school={dbUser.school} initialAnalytics={JSON.parse(JSON.stringify(dashboardData))} />;

        case 'HOMEROOM':
        case 'TEACHER':
            dashboardData = await getTeacherDashboardData(dbUser.id);
            return <TeacherView user={dbUser} initialData={JSON.parse(JSON.stringify(dashboardData))} />;

        case 'PARENT':
            dashboardData = await getFamilyChildren(dbUser.id);
            return <ParentView user={dbUser} childrenData={JSON.parse(JSON.stringify(dashboardData))} />;

        case 'STUDENT':
            redirect('/dashboard/student');

        default:
            return <div className="p-20 text-center font-medium uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Operational Role Not Discovered</div>;
    }
}


