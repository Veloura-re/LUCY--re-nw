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

    const dbUser = await getCachedUser(user.id);
    if (!dbUser || !dbUser.schoolId) {
        redirect("/dashboard");
    }

    // Parallelize data fetching for sub-second performance
    const [students, grades] = await Promise.all([
        getCachedSchoolStudents(dbUser.schoolId),
        getCachedSchoolStructure(dbUser.schoolId)
    ]);

    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Synthesizing Registry..." /></div>}>
            <StudentsClientWrapper 
                initialStudents={students}
                initialGrades={grades}
            />
        </Suspense>
    );
}
