import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { requireRole, handleApiError, secureJson, rateLimit, TEACHER_ROLES } from "@/lib/security";
import { AiQuestionsArraySchema } from "@/lib/schemas";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    const limit = rateLimit(req, "teacher/exams/extract", 10);
    if (limit) return limit;

    try {
        const dbUser = await requireRole(TEACHER_ROLES);

        const { image, text: rawText, mode = "generative", count = 5, difficulty = "medium", allowedTypes = [] } = (await req.json()) as any;

        if (!image && !rawText) {
            return NextResponse.json({ error: "Missing input data (image or text)" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const typeConstraint = allowedTypes.length > 0
            ? `ONLY use these question types: ${allowedTypes.join(", ")}.`
            : "Use a balanced mix of appropriate question types.";

        const prompt = `
            You are a master academic architect. Analyze the providing data and synthesize a high-fidelity exam assessment.
            
            Mode: ${mode} (Options: RECALL, CRITICAL_THINKING, REVISION, MIXED)
            Quantity Request: ${count} questions.
            Difficulty Target: ${difficulty}
            Type Constraint: ${typeConstraint}
            
            Supported Question Schema:
            1. MCQ (Multiple Choice): { "type": "MCQ", "text": "...", "options": ["A", "B", "C", "D"], "correctOption": 0, "points": 10 }
            2. SHORT (Short Answer): { "type": "SHORT", "text": "...", "answer": "The specific correct answer", "keywords": ["key", "words"], "points": 10 }
            3. LONG (Essay/Long Answer): { "type": "LONG", "text": "...", "criteria": "Grading criteria", "minWords": 50, "points": 20 }
            4. TF (True / False): { "type": "TF", "text": "...", "answer": true, "points": 5 }

            Architectural Rules:
            - Respect the Type Constraint strictly.
            - If RECALL: Focus on dates, names, and explicit facts.
            - If CRITICAL_THINKING: Focus on "How" and "Why".
            - If REVISION: Provide a balanced sweep across the provided context.
            - Assign points logically based on difficulty and depth.
            
            Return ONLY a raw JSON array of question objects.
            Input Data:
            ${rawText || "See attached image for context."}
        `;

        let result;
        if (image) {
            result = await model.generateContent([
                prompt,
                { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } },
            ]);
        } else {
            result = await model.generateContent([prompt, rawText || "Synthesize questions based on current context."]);
        }

        const response = await result.response;
        let text = response.text().trim();

        // Robust JSON Extraction
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            text = jsonMatch[0];
        } else {
            // Cleanup standard markdown if match fails
            if (text.startsWith("```json")) {
                text = text.replace(/```json\n?/, "").replace(/\n?```/, "");
            } else if (text.startsWith("```")) {
                text = text.replace(/```\n?/, "").replace(/\n?```/, "");
            }
        }

        const rawQuestions = JSON.parse(text);
        const questions = AiQuestionsArraySchema.parse(rawQuestions);
        return secureJson({ questions });
    } catch (e) {
        return handleApiError(e);
    }
}
