import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import StaffRolesClient from "./staff-roles-client";

export default async function StaffRolesPage() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) redirect("/login");

    let dbUser: any = null;
    try {
        dbUser = await getCachedUser(authUser.id);
    } catch (e) {
        console.error('[StaffRolesPage] Failed to fetch profile:', e);
    }

    if (!dbUser || !dbUser.schoolId || !['OWNER', 'PRINCIPAL'].includes(dbUser.role)) {
        redirect("/dashboard");
    }

    return <StaffRolesClient schoolName={dbUser.school?.name || "Institution"} />;
}
