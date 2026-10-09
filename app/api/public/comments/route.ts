import { prisma } from "@/lib/prisma";
import { rateLimit, secureJson, validateStringInput } from "@/lib/security";
import { unstable_cache } from "next/cache";
import { rateLimitShared } from '@/lib/rate-limit';

const EMOJIS = ["🔭", "⚡", "🛸", "🧠", "🌐", "⬡", "🔒", "🚀", "💡", "🌍", "🤖", "✨"];

const getApprovedComments = unstable_cache(
    async () => {
        const start = Date.now();
        const comments = await prisma.publicComment.findMany({
            where: { approved: true },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: { id: true, callsign: true, message: true, emoji: true, createdAt: true },
        });
        return { comments, latency: `${Date.now() - start}ms`, runtime: process.env.NEXT_RUNTIME || 'unknown' };
    },
    ["public-comments-cache"],
    { revalidate: 60, tags: ["comments"] }
);

// GET /api/public/comments — fetch latest 50 approved comments
export async function GET(request: Request) {
    // Rate limit: 30 requests/min per IP
    const limited = rateLimit(request, "public/comments/GET", 30);
    if (limited) return limited;

    try {
        const data = await getApprovedComments();
        return secureJson(data);
    } catch (e: any) {
        console.error("[Comments/GET] Error:", e);
        return secureJson({ error: "failed to fetch" }, 500);
    }
}

interface CommentBody {
    email_placeholder?: string;
    callsign: string;
    message: string;
    emoji: string;
}

// POST /api/public/comments — submit a comment
export async function POST(request: Request) {
    // Rate limit: 5 requests/min per IP
    const limited = await rateLimitShared(request, "public/comments/POST", 5);
    if (limited) return limited;

    try {
        const body = (await request.json()) as CommentBody;

        // Honeypot check (Bot protection)
        if (body.email_placeholder) {
            console.warn("[Comments/POST] Honeypot triggered by bot.");
            return secureJson({ error: "Security check failed" }, 403);
        }

        // Validate & sanitize inputs
        const callsign = validateStringInput(body.callsign, 40);
        const message = validateStringInput(body.message, 280);
        const emoji = EMOJIS.includes(body.emoji) ? body.emoji : EMOJIS[crypto.getRandomValues(new Uint32Array(1))[0] % EMOJIS.length];

        if (!callsign || !message) {
            return secureJson({ error: "callsign and message required (1-40 chars, 1-280 chars)" }, 400);
        }

        // Spam guard: no more than 3 comments per callsign per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = await prisma.publicComment.count({
            where: { callsign: { equals: callsign, mode: "insensitive" }, createdAt: { gte: today } },
        });
        if (count >= 3) {
            return secureJson({ error: "daily limit reached for this callsign" }, 429);
        }

        const comment = await prisma.publicComment.create({
            data: { callsign, message, emoji },
            select: { id: true, callsign: true, message: true, emoji: true, createdAt: true },
        });

        return secureJson({ comment }, 201);
    } catch (e) {
        console.error("[Comments/POST] Error:", e);
        return secureJson({ error: "failed to create" }, 500);
    }
}
