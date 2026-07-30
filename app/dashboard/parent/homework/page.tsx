import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { getCachedStudentAssignments } from "@/lib/services/assignments";
import ParentHomeworkRegistry from "@/components/dashboard/parent-homework-registry";
import { Suspense } from "react";
import { Activity } from "lucide-react";

export default async function Page({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
    const params = await searchParams;
    const studentId = params.studentId;

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || (dbUser.role !== 'PARENT' && dbUser.role !== 'PRINCIPAL' && dbUser.role !== 'SUPERADMIN')) {
        redirect("/dashboard");
    }

    if (!studentId) {
        return <ErrorState message="Request Context Undefined: Student ID required for registry synchronization." />;
    }

    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify parent-student linkage via Supabase REST
    const { data: linkData } = await supabaseAdmin
        .from('ParentStudentLink')
        .select('*, student:Student(*, school:School(*), class:Class(*))')
        .eq('parentId', dbUser.id)
        .eq('studentId', studentId)
        .maybeSingle();
    const link = linkData;

    // Principals and Superadmins have global bypass access
    const hasAccess = link || dbUser.role === 'PRINCIPAL' || dbUser.role === 'SUPERADMIN';

    if (!hasAccess) {
        return <ErrorState message="Security Fault: You do not have verified authorization to access this scholastic registry." />;
    }

    // If access via principal/superadmin but no link, fetch the student manually
    let targetStudent = link ? link.student : null;
    if (!targetStudent) {
        const { data: s } = await supabaseAdmin
            .from('Student')
            .select('*, school:School(*), class:Class(*)')
            .eq('id', studentId)
            .maybeSingle();
        targetStudent = s;
    }

    if (!targetStudent || !targetStudent.classId) {
        return <ErrorState message="Registry Integrity Fault: Student record or cohort mapping not discovered." />;
    }

    // Fetch assignments using the cached service
    const assignments = await getCachedStudentAssignments(targetStudent.schoolId, targetStudent.classId, targetStudent.id);

    return (
        <Suspense fallback={<RegistryLoadingFallback />}>
            <ParentHomeworkRegistry 
                initialAssignments={assignments}
                studentName={`${targetStudent.firstName} ${targetStudent.lastName}`}
                studentCode={targetStudent.studentCode}
            />
        </Suspense>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 text-center">
            <Activity className="w-12 h-12 text-zinc-800 dark:text-zinc-200 mb-6 animate-pulse" />
            <h3 className="text-2xl font-black text-zinc-700 italic uppercase">System Alert</h3>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2 max-w-md">{message}</p>
        </div>
    );
}

function RegistryLoadingFallback() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 text-center">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border border-zinc-200 dark:border-white/5 border-t-white animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-zinc-900 dark:text-white animate-pulse" />
                </div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-900 dark:text-white italic">Synchronizing Scholastic Repository</p>
        </div>
    );
}
