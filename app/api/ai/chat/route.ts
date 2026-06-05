import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth, handleApiError, rateLimit, secureJson } from "@/lib/security";
import { createClient } from "@supabase/supabase-js";

console.log("[DEBUG] Loading Chat Route Module (Edge-Native)");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Initialize Supabase client for Edge-native database access
// This bypasses Prisma's current bundling issues in OpenNext
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    console.log("[DEBUG] POST /api/ai/chat entered");
    try {
        // 1. Rate Limiting (10 requests per minute)
        const rateLimitResponse = rateLimit(req, "ai/chat", 10);
        if (rateLimitResponse) return rateLimitResponse;

        // 2. Authentication
        const user = await requireAuth();
        
        // Use Supabase directly to bypass Prisma bundling issues
        const { data: dbUser, error: dbError } = await supabase
            .from('User')
            .select('id, email, role')
            .eq('id', user.id)
            .single();
        
        if (dbError || !dbUser) {
            console.error("[DEBUG] DB User Lookup Error:", dbError);
            return secureJson({ error: "User profile not found" }, 404);
        }

        const body = await req.json() as any;
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return secureJson({ error: "Invalid messages format" }, 400);
        }

        console.log(`[DEBUG] Chatting with AI for user: ${dbUser.email}`);

        // 3. AI Interaction
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const lastMessage = messages[messages.length - 1].content;
        const result = await model.generateContent(lastMessage);
        const response = await result.response;
        const text = response.text();

        return secureJson({ text });
    } catch (error: any) {
        console.error("[DEBUG] Chat API Error:", error);
        return handleApiError(error);
    }
}
