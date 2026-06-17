import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { FinanceView } from "@/components/dashboard/finance-view";
import { ParentBillingView } from "@/components/dashboard/parent-billing-view";
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export default async function FinancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    if (!dbUser.schoolId && dbUser.role === 'SUPERADMIN') {
        dbUser.schoolId = 'c4020909-c825-4490-9790-18e0632dbeaf';
    }

    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch school with grades
    const { data: school } = await supabaseAdmin
        .from('School')
        .select('*, grades:Grade(*, orderBy:level.asc)')
        .eq('id', dbUser.schoolId)
        .maybeSingle();

    // Fetch grades separately for cleaner query
    const { data: grades } = await supabaseAdmin
        .from('Grade')
        .select('*')
        .eq('schoolId', dbUser.schoolId)
        .order('level', { ascending: true });

    const schoolWithGrades = school ? { ...(school as any), grades: grades || [] } : null;

    if (dbUser.role === 'OWNER' || dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN') {
        return <FinanceView user={dbUser} school={schoolWithGrades} grades={grades || []} />;
    }

    if (dbUser.role === 'PARENT') {
        const { data: studentLinks } = await supabaseAdmin
            .from('ParentStudentLink')
            .select('*, student:Student(*, school:School(*), grade:Grade(*), invoices:Invoice(*, items:InvoiceItem(*), payments:Payment(*)))')
            .eq('parentId', dbUser.id);

        const students = (studentLinks || []).map((link: any) => link.student);
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
