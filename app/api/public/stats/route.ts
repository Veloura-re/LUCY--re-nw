import { prisma } from "@/lib/prisma";
import { rateLimit, secureJson } from "@/lib/security";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getPublicStats = unstable_cache(
    async () => {
        const [schools, students, teachers, classes] = await Promise.all([
            prisma.school.count(),
            prisma.student.count(),
            prisma.user.count({ where: { role: { in: ["TEACHER", "HOMEROOM"] } } }),
            prisma.class.count(),
        ]);
        return { schools, students, teachers, classes, totalNodes: schools + students + teachers + classes };
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
    } catch {
        // Return graceful zeros on any error (db not connected etc.)
        return secureJson({ schools: 0, students: 0, teachers: 0, classes: 0, totalNodes: 0 });
    }
}
