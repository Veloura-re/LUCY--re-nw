import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { DirectorView } from "@/components/dashboard/director-view";
import { ParentView } from "@/components/dashboard/parent-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { StudentView } from "@/components/dashboard/student-view";
import { redirect } from "next/navigation";
import { getFamilyChildren, getSchoolAnalytics, getTeacherDashboardData } from "@/lib/dashboard-data";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    let dbUser: any = null;
    try {
        dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                school: {
                    include: {
                        _count: {
                            select: { students: true, users: true }
                        }
                    }
                }
            }
        });

        if (!dbUser && user.email) {
            dbUser = await prisma.user.findUnique({
                where: { email: user.email },
                include: {
                    school: {
                        include: {
                            _count: {
                                select: { students: true, users: true }
                            }
                        }
                    }
                }
            });
        }
    } catch (dbError) {
        console.error("[Dashboard Page] Prisma Connection Error:", dbError);
        return (
            <div className="p-20 text-center">
                <p className="text-zinc-600 font-medium uppercase tracking-[0.3em] text-[10px]">Neural Uplink Interrupted</p>
                <p className="text-zinc-800 text-[10px] font-medium uppercase tracking-widest mt-3">The institutional grid is currently unreachable. Retrying synchronization...</p>
            </div>
        );
    }

    if (!dbUser) return <div>User not found</div>;

    if (dbUser.role === 'SUPERADMIN') {
        redirect('/admin/dashboard');
    }

    // Role-specific data pre-fetching
    let dashboardData: any = null;

    switch (dbUser.role) {
        case 'PRINCIPAL':
            if (dbUser.schoolId) {
                dashboardData = await getSchoolAnalytics(dbUser.schoolId);
            }
            return <DirectorView user={dbUser} school={dbUser.school} initialAnalytics={dashboardData} />;

        case 'HOMEROOM':
        case 'TEACHER':
            dashboardData = await getTeacherDashboardData(dbUser.id);
            return <TeacherView user={dbUser} initialData={dashboardData} />;

        case 'PARENT':
            dashboardData = await getFamilyChildren(dbUser.id);
            return <ParentView user={dbUser} childrenData={dashboardData} />;

        case 'STUDENT':
            redirect('/dashboard/student');

        default:
            return <div className="p-20 text-center font-medium uppercase tracking-widest text-zinc-800">Operational Role Not Discovered</div>;
    }
}

