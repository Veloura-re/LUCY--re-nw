import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { PayrollView } from "@/components/dashboard/payroll-view";
import { prisma } from "@/lib/prisma";

export default async function PayrollPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    const schoolId = dbUser.schoolId;

    if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN' || dbUser.role === 'ACCOUNTANT') {
        const school = await prisma.school.findUnique({
            where: { id: schoolId || '' }
        });

        return <PayrollView user={dbUser} school={school} />;
    }

    if (dbUser.role === 'TEACHER' || dbUser.role === 'HOMEROOM') {
        const { StaffPaycheckView } = await import("@/components/dashboard/staff-paycheck-view");
        return <StaffPaycheckView user={dbUser} />;
    }

    redirect("/dashboard/finance");
}
