import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth, handleApiError, secureJson } from "@/lib/security";
import { createClient } from "@supabase/supabase-js";
import { rateLimitShared } from '@/lib/rate-limit';

console.log("[DEBUG] Loading Chat Route Module (Edge-Native)");

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    console.log("[DEBUG] POST /api/ai/chat entered");
    try {
        // 1. Rate Limiting (10 requests per minute)
        const rateLimitResponse = await rateLimitShared(req, "ai/chat", 10);
        if (rateLimitResponse) return rateLimitResponse;

        // 2. Authentication
        const user = await requireAuth();
        
        // Initialize Supabase client for Edge-native database access lazily
        // This bypasses Prisma's current bundling issues in OpenNext and avoids build-time environment variable requirements
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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
        const result = await model.generateContentStream(lastMessage);
        
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        if (chunkText) {
                            controller.enqueue(new TextEncoder().encode(chunkText));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: any) {
        console.error("[DEBUG] Chat API Error:", error);
        return secureJson({ 
            error: "AI API Error" }, 500);
    }
}
