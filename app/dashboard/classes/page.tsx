import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedSchoolStructure, getCachedSchoolConfig } from "@/lib/services/school";
import { getCachedSchoolTeachers } from "@/lib/services/teachers";
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

    const dbUser = await getCachedUser(user.id);
    if (!dbUser || !dbUser.schoolId) {
        redirect("/dashboard");
    }

    // Parallelize all institutional lookups for sub-second delivery
    const [grades, teachers, subjects] = await Promise.all([
        getCachedSchoolStructure(dbUser.schoolId),
        getCachedSchoolTeachers(dbUser.schoolId),
        getCachedSchoolSubjects(dbUser.schoolId)
    ]);

    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Mapping Institutional Hierarchy..." />
            </div>
        }>
            <ClassesClientWrapper 
                initialGrades={grades}
                initialTeachers={teachers}
                initialSubjects={subjects}
            />
        </Suspense>
    );
}
