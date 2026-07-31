import { prisma } from "@/lib/prisma";
import { rateLimit, secureJson } from "@/lib/security";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getPublicStats = unstable_cache(
    async () => {
        // Sequential count lookups to avoid CPU spikes on Cloudflare Edge
        const schools = await prisma.school.count();
        const students = await prisma.student.count();
        const teachers = await prisma.user.count({ where: { role: { in: ["TEACHER", "HOMEROOM"] } } });
        const classes = await prisma.class.count();

        return { schools, students, teachers, classes, totalSchools: schools + students + teachers + classes };
    },
    ["public-stats-cache"],
    { revalidate: 300, tags: ["stats"] }
);

// GET /api/public/stats — public aggregate stats
export async function GET(request: Request) {
    // Rate limit: 30 requests/min per IP
    const limited = rateLimit(request, "public/stats/GET", 30);
    if (limited) return limited;

    try {
        const stats = await getPublicStats();
        return secureJson(stats);
    } catch (e: any) {
        console.error("[PublicStats/GET] Error:", e.message);
        // Return zeros only on actual failure
        return secureJson({ schools: 0, students: 0, teachers: 0, classes: 0, totalSchools: 0 });
    }
}
