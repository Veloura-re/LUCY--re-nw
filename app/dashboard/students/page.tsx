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

    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(user.id);
    } catch (e) {
        console.error('[StudentsPage] Profile fetch error:', e);
    }

    if (!dbUser || !dbUser.schoolId) {
        redirect("/dashboard");
    }

    let students: any[] = [];
    let grades: any[] = [];

    try {
        // Sequential lookups to manage CPU peak usage on Edge cold starts
        students = await getCachedSchoolStudents(dbUser.schoolId);
        grades = await getCachedSchoolStructure(dbUser.schoolId);
    } catch (e) {
        console.error('[StudentsPage] Registry synthesis error:', e);
    }

    return (
        <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><SpringingLoader message="Synthesizing Registry..." /></div>}>
            <StudentsClientWrapper 
                initialStudents={students || []}
                initialGrades={grades || []}
            />
        </Suspense>
    );
}
