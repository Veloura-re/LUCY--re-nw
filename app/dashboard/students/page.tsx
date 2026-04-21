import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { getCachedSchoolStudents } from "@/lib/services/students";
import { getCachedSchoolStructure } from "@/lib/services/school";
import StudentsClientWrapper from "@/components/dashboard/students-client-wrapper";
import { Suspense } from "react";
import SpringingLoader from "@/components/dashboard/springing-loader";

export default async function StudentsPage() {
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
        console.error('[StudentsPage] Profile fetch error:', e);
    }
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
    if (!dbUser || !dbUser.schoolId) {
        redirect("/dashboard");
    }

<<<<<<< HEAD
    // Parallelize data fetching for sub-second performance
    const [students, grades] = await Promise.all([
        getCachedSchoolStudents(dbUser.schoolId),
        getCachedSchoolStructure(dbUser.schoolId)
    ]);
=======
    let students: any[] = [];
    let grades: any[] = [];

    try {
        // Sequential lookups to manage CPU peak usage on Edge cold starts
        students = await getCachedSchoolStudents(dbUser.schoolId);
        grades = await getCachedSchoolStructure(dbUser.schoolId);
    } catch (e) {
        console.error('[StudentsPage] Registry synthesis error:', e);
    }
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533

    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Synthesizing Registry..." /></div>}>
            <StudentsClientWrapper 
<<<<<<< HEAD
                initialStudents={students}
                initialGrades={grades}
=======
                initialStudents={students || []}
                initialGrades={grades || []}
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
            />
        </Suspense>
    );
}
