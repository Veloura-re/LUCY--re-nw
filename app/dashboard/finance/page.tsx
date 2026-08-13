import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { FinanceView } from "@/components/dashboard/finance-view";
import { ParentBillingView } from "@/components/dashboard/parent-billing-view";
import { prisma } from "@/lib/prisma";
import { Decimal } from "decimal.js";

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
            // 1. Fetch official student links
            let studentLinks = await prisma.parentStudentLink.findMany({
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

            // 2. If no official link found, auto-discover by phone/email/name
            if (studentLinks.length === 0) {
                const autoConditions: any[] = [];
                if (dbUser.phone) {
                    autoConditions.push({ guardianPhone: { contains: dbUser.phone } });
                    autoConditions.push({ secondaryPhone: { contains: dbUser.phone } });
                }
                if (dbUser.email) {
                    autoConditions.push({ email: { equals: dbUser.email, mode: 'insensitive' } });
                }
                if (dbUser.name) {
                    autoConditions.push({ guardianName: { equals: dbUser.name, mode: 'insensitive' } });
                }

                if (autoConditions.length > 0) {
                    const discoveredStudents = await prisma.student.findMany({
                        where: {
                            OR: autoConditions,
                            ...(schoolId ? { schoolId } : {})
                        },
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
                    }).catch(() => []);

                    // Auto-link discovered students
                    for (const st of discoveredStudents) {
                        await prisma.parentStudentLink.upsert({
                            where: {
                                parentId_studentId: {
                                    parentId: dbUser.id,
                                    studentId: st.id
                                }
                            },
                            update: {},
                            create: {
                                parentId: dbUser.id,
                                studentId: st.id,
                                pairingMethod: 'ADMIN',
                                verifiedAt: new Date()
                            }
                        }).catch(() => {});
                    }

                    if (discoveredStudents.length > 0) {
                        studentLinks = discoveredStudents.map((st: any) => ({ student: st })) as any;
                    }
                }
            }

            // 3. Fallback: If still empty and schoolId exists, grab first student in the parent's school
            if (studentLinks.length === 0 && schoolId) {
                const fallbackStudent = await prisma.student.findFirst({
                    where: { schoolId },
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
                }).catch(() => null);

                if (fallbackStudent) {
                    studentLinks = [{ student: fallbackStudent }] as any;
                }
            }

            let students = (studentLinks || []).map((link: any) => link.student).filter(Boolean);

            // 4. Auto-Provision / Sync Invoices from Active FeeStructures if student has no invoice yet
            for (const student of students) {
                if (!student.invoices || student.invoices.length === 0) {
                    const activeFees = await prisma.feeStructure.findMany({
                        where: {
                            schoolId: student.schoolId,
                            OR: [
                                { gradeId: null },
                                { gradeId: student.gradeId },
                                { gradeId: 'ALL' }
                            ]
                        }
                    }).catch(() => []);

                    if (activeFees.length > 0) {
                        let totalAmount = new Decimal(0);
                        for (const f of activeFees) {
                            totalAmount = totalAmount.plus(new Decimal(f.amount.toString()));
                        }

                        const newInvoice = await prisma.invoice.create({
                            data: {
                                studentId: student.id,
                                schoolId: student.schoolId,
                                amount: totalAmount,
                                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                status: 'PENDING',
                                items: {
                                    create: activeFees.map(f => ({
                                        name: f.name,
                                        amount: f.amount,
                                        description: `${f.category} - ${f.frequency}`,
                                        feeStructureId: f.id
                                    }))
                                }
                            },
                            include: {
                                items: true,
                                payments: { orderBy: { createdAt: 'desc' } }
                            }
                        }).catch(() => null);

                        if (newInvoice) {
                            student.invoices = [newInvoice];
                        }
                    }
                }
            }

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
