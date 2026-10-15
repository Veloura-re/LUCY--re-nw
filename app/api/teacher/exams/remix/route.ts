import { NextResponse } from "next/server";
import { requireRole, handleApiError, secureJson, TEACHER_ROLES } from "@/lib/security";
import { AiQuestionsArraySchema } from "@/lib/schemas";
import { rateLimitShared } from '@/lib/rate-limit';
import { withAudit } from '@/lib/with-audit';
import { sandboxedModel, userInput } from '@/lib/ai';

async function handlePOST(req: Request) {
    const limit = await rateLimitShared(req, "teacher/exams/remix", 10);
    if (limit) return limit;

    try {
        const dbUser = await requireRole(TEACHER_ROLES);

        const { questions } = (await req.json()) as any;

        if (!questions || !Array.isArray(questions)) {
            return NextResponse.json({ error: "No questions provided for remixing" }, { status: 400 });
        }

        const model = sandboxedModel();

        const prompt = `
            You are an expert assessment designer. Your task is to REMIX the following exam questions.
            
            OBJECTIVES:
            1. Generate DIFFERENT but SIMILAR questions that cover the EXACT SAME academic topics.
            2. Maintain the same difficulty level.
            3. Keep the EXACT SAME structure (type, points, number of options).
            4. For MCQs, change the options and correct answer if possible, but keep them plausible.
            5. For Short Answer, change the numbers or specified criteria if applicable.
            
            Original Questions:
            ${userInput(JSON.stringify(questions.slice(0, 100)), 60000)}
            
            Return ONLY a raw JSON array of the remixed questions. DO NOT include the original questions. DO NOT include any text outside the JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith("```json")) {
            text = text.replace(/```json\n?/, "").replace(/\n?```/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/```\n?/, "").replace(/\n?```/, "");
        }

        const rawQuestions = JSON.parse(text);
        const remixedQuestions = AiQuestionsArraySchema.parse(rawQuestions);
        return secureJson({ questions: remixedQuestions });
    } catch (e) {
        return handleApiError(e);
    }
}

export const POST = withAudit(handlePOST, { action: 'AI_REMIX_EXAM', resourceType: 'exam' });
