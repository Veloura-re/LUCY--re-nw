import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { RevenueView } from "@/components/dashboard/revenue-view";
import { prisma } from "@/lib/prisma";

export default async function RevenuePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    const schoolId = dbUser.schoolId;

    if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN') {
        const [school, grades] = await Promise.all([
            prisma.school.findUnique({
                where: { id: schoolId || '' },
                include: { grades: { orderBy: { level: 'asc' } } }
            }),
            prisma.grade.findMany({
                where: { schoolId: schoolId || '' },
                orderBy: { level: 'asc' }
            })
        ]);

        return <RevenueView user={dbUser} school={school} grades={grades || []} />;
    }

    redirect("/dashboard/finance");
}
