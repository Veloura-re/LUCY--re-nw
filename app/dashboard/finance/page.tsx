import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { FinanceView } from "@/components/dashboard/finance-view";
import { ParentBillingView } from "@/components/dashboard/parent-billing-view";
import { prisma } from "@/lib/prisma";

export default async function FinancePage() {
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
        return <FinanceView user={dbUser} school={school} grades={grades || []} />;
    }

    if (dbUser.role === 'PARENT') {
        // Fetch student links and all nested invoices using Prisma for 100% relational integrity
        const studentLinks = await prisma.parentStudentLink.findMany({
            where: { parentId: dbUser.id },
            include: {
                student: {
                    include: {
                        school: true,
                        grade: true,
                        class: true,
                        invoices: {
                            orderBy: { createdAt: 'desc' },
                            include: {
                                items: true,
                                payments: {
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Also fetch school info for the header
        const school = studentLinks[0]?.student?.school || null;
        const students = studentLinks.map((link) => link.student).filter(Boolean);

        return (
            <ParentBillingView user={dbUser} students={students} school={school} />
        );
    }

    if (dbUser.role === 'TEACHER' || dbUser.role === 'HOMEROOM') {
        const { StaffPaycheckView } = await import("@/components/dashboard/staff-paycheck-view");
        return <StaffPaycheckView user={dbUser} />;
    }

    redirect("/dashboard");
}
