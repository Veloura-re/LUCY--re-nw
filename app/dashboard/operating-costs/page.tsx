import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/users";
import { OperatingCostsView } from "@/components/dashboard/operating-costs-view";

export const metadata = {
    title: "Operating Costs | Internal Ledger",
};

export default async function OperatingCostsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id) as any;
    if (!dbUser) redirect("/login");

    const allowedRoles = ["SUPERADMIN", "OWNER", "PRINCIPAL", "ACCOUNTANT"];
    if (!allowedRoles.includes(dbUser.role)) {
        redirect("/dashboard");
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <OperatingCostsView />
        </div>
    );
}
