import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedSchoolStructure, getCachedSchoolConfig } from "@/lib/services/school";
import { getCachedTeacherRegistry } from "@/lib/services/teachers";
import { getCachedSchoolSubjects } from "@/lib/services/school-curriculum";
import ClassesClientWrapper from "@/components/dashboard/classes-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default async function ClassesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

<<<<<<< HEAD
    const dbUser = await getCachedUser(user.id);
=======
    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(user.id);
    } catch (e) {
        console.error('[ClassesPage] Failed to fetch user profile:', e);
    }
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
    if (!dbUser || !dbUser.schoolId) {
        redirect("/dashboard");
    }

<<<<<<< HEAD
    // Parallelize all institutional lookups for sub-second delivery
    const [grades, teachers, subjects] = await Promise.all([
        getCachedSchoolStructure(dbUser.schoolId),
        getCachedTeacherRegistry(dbUser.schoolId),
        getCachedSchoolSubjects(dbUser.schoolId)
    ]);
=======
    // Optimization: Sequential fetching on Edge to prevent CPU spike triggers
    let grades: any[] = [];
    let teachers: any[] = [];
    let subjects: any[] = [];

    try {
        // We fetch sequentially to stay under peak CPU limits during cold starts
        console.time(`[ClassesPage] Sequence Fetch: ${user.id}`);
        
        grades = await getCachedSchoolStructure(dbUser.schoolId);
        teachers = await getCachedTeacherRegistry(dbUser.schoolId);
        subjects = await getCachedSchoolSubjects(dbUser.schoolId);
        
        console.timeEnd(`[ClassesPage] Sequence Fetch: ${user.id}`);
    } catch (e) {
        console.error('[ClassesPage] Data sequence interrupted:', e);
    }
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Mapping Institutional Hierarchy..." />
            </div>
        }>
            <ClassesClientWrapper 
<<<<<<< HEAD
                initialGrades={grades}
                initialTeachers={teachers}
                initialSubjects={subjects}
=======
                initialGrades={grades || []}
                initialTeachers={teachers || []}
                initialSubjects={subjects || []}
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
            />
        </Suspense>
    );
}
