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

    let schoolId = dbUser.schoolId;
    if (!schoolId) {
        const firstSchool = await prisma.school.findFirst().catch(() => null);
        schoolId = firstSchool?.id || null;
    }

    if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN') {
        const [school, grades] = await Promise.all([
            schoolId ? prisma.school.findUnique({
                where: { id: schoolId },
                include: { grades: { orderBy: { level: 'asc' } } }
            }).catch(() => null) : prisma.school.findFirst({
                include: { grades: { orderBy: { level: 'asc' } } }
            }).catch(() => null),
            prisma.grade.findMany({
                where: schoolId ? { schoolId } : {},
                orderBy: { level: 'asc' }
            }).catch(() => [])
        ]);
        return (
            <FinanceView 
                user={JSON.parse(JSON.stringify(dbUser))} 
                school={school ? JSON.parse(JSON.stringify(school)) : null} 
                grades={JSON.parse(JSON.stringify(grades || []))} 
            />
        );
    }

    if (dbUser.role === 'PARENT') {
        try {
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
            }).catch(() => []);

            // Also fetch school info for the header
            const students = (studentLinks || []).map((link: any) => link.student).filter(Boolean);
            const school = students[0]?.school || (schoolId ? await prisma.school.findUnique({ where: { id: schoolId } }).catch(() => null) : await prisma.school.findFirst().catch(() => null));

            return (
                <ParentBillingView 
                    user={JSON.parse(JSON.stringify(dbUser))} 
                    students={JSON.parse(JSON.stringify(students))} 
                    school={school ? JSON.parse(JSON.stringify(school)) : null} 
                />
            );
        } catch (error) {
            console.error("[Parent Billing Page Error]:", error);
            return (
                <ParentBillingView 
                    user={JSON.parse(JSON.stringify(dbUser))} 
                    students={[]} 
                    school={null} 
                />
            );
        }
    }

    if (dbUser.role === 'TEACHER' || dbUser.role === 'HOMEROOM') {
        const { StaffPaycheckView } = await import("@/components/dashboard/staff-paycheck-view");
        return <StaffPaycheckView user={JSON.parse(JSON.stringify(dbUser))} />;
    }

    redirect("/dashboard");
}
