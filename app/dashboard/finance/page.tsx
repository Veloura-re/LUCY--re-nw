import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FinanceView } from "@/components/dashboard/finance-view";
import { ParentBillingView } from "@/components/dashboard/parent-billing-view";

export default async function FinancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            school: {
                include: {
                    grades: {
                        orderBy: { level: 'asc' }
                    }
                }
            }
        }
    }) as any;

    if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
                school: {
                    include: {
                        grades: {
                            orderBy: { level: 'asc' }
                        }
                    }
                }
            }
        }) as any;
    }

    if (!dbUser) redirect("/login");

    if (dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN') {
        return <FinanceView user={dbUser} school={dbUser.school} grades={dbUser.school?.grades || []} />;
    }

    if (dbUser.role === 'PARENT') {
        // Robust user matching: if ID mismatch, use dbUser.id which is the Prisma ID
        const studentLinks = await prisma.parentStudentLink.findMany({
            where: { parentId: dbUser.id },
            include: {
                student: {
                    include: {
                        school: true,
                        grade: true,
                        invoices: {
                            include: {
                                items: true,
                                payments: true
                            },
                            orderBy: { createdAt: 'desc' }
                        }
                    } as any
                }
            }
        }) as any[];

        const students = studentLinks.map(link => link.student);
        return (
            <ParentBillingView user={dbUser} students={students} school={dbUser.school} />
        );
    }

    if (dbUser.role === 'TEACHER' || dbUser.role === 'HOMEROOM') {
        const { StaffPaycheckView } = await import("@/components/dashboard/staff-paycheck-view");
        return <StaffPaycheckView user={dbUser} />;
    }

    // Default fallback
    redirect("/dashboard");
}
