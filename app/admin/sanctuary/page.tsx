import { Metadata } from "next";
import { requireRole } from "@/lib/security";
import SanctuaryModerationClient from "@/components/dashboard/sanctuary-moderation-client";

export const metadata: Metadata = {
    title: "Sanctuary Moderation & Interconnect Safety | SuperAdmin Control",
    description: "Platform-wide cross-campus connection topology, real-time anti-doxxing telemetry, and student safety moderation console."
};

export default async function AdminSanctuaryModerationPage() {
    const user = await requireRole(['SUPERADMIN']);

    return (
        <div className="space-y-6 pt-6 px-4 sm:px-8 max-w-7xl mx-auto">
            <SanctuaryModerationClient 
                userRole={user.role} 
                userSchoolId="" 
            />
        </div>
    );
}
