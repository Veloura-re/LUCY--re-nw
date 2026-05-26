import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedStudentAssignments } from "@/lib/services/assignments";
import StudentTaskMatrix from "@/components/dashboard/student-task-matrix";
import { Suspense } from "react";
import { Activity } from "lucide-react";

export default async function StudentAssignmentsPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    const dbUser = await getCachedUser(authUser.id);
    if (!dbUser || !dbUser.schoolId) redirect("/dashboard");

    // Get the student record — Edge-safe (prisma may be null on Cloudflare Workers)
    let student: { id: string; classId: string | null } | null = null;

    const { prisma } = require('@/lib/prisma');
    if (!prisma) {
        // Edge runtime: use Supabase REST
        const { createClient: createAdmin } = require('@supabase/supabase-js');
        const supabaseAdmin = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data } = await supabaseAdmin
            .from('Student')
            .select('id, classId')
            .eq('userId', dbUser.id)
            .single();
        student = data;
    } else {
        student = await prisma.student.findUnique({
            where: { userId: dbUser.id },
            select: { id: true, classId: true }
        });
    }

    if (!student || !student.classId) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 text-center">
                <Activity className="w-12 h-12 text-zinc-800 mb-6 animate-pulse" />
                <h3 className="text-2xl font-black text-zinc-700 italic uppercase tracking-tighter">Registry Sync Required</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Your profile is not yet linked to a cohort. Contact administration for enrollment.</p>
            </div>
        );
    }

    // Fetch assignments using the cached service
    const assignments = await getCachedStudentAssignments(dbUser.schoolId, student.classId, student.id);

    return (
        <Suspense fallback={<AssignmentsLoadingFallback />}>
            <StudentTaskMatrix 
                initialAssignments={assignments}
                studentId={student.id}
            />
        </Suspense>
    );
}

function AssignmentsLoadingFallback() {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border border-white/5 border-t-white animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-white animate-pulse" />
                </div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white italic">Calibrating Academic Trajectory</p>
        </div>
    );
}
