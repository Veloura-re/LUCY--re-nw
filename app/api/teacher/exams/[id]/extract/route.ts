import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError,  } from "@/lib/security";
import { logActivity, getIp } from "@/lib/audit";
import { rateLimitShared } from '@/lib/rate-limit';

const MAX_IMAGE_CHARS = 6 * 1024 * 1024; // roughly 4.5MB of decoded image data

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const limited = await rateLimitShared(req, "teacher/exams/extract", 10);
    if (limited) return limited;

    let user;
    try {
        user = await requireRole(['TEACHER', 'HOMEROOM']);

        const exam = await prisma.exam.findUnique({
            where: { id },
            select: { class: { select: { grade: { select: { schoolId: true } } } } }
        });
        if (!exam || exam.class?.grade?.schoolId !== user.schoolId) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }
    } catch (e) {
        return handleApiError(e);
    }

    try {
        const { image } = (await req.json().catch(() => ({}))) as { image?: unknown }; // base64 image data

        if (typeof image !== 'string' || !image.startsWith("data:image/") || !image.includes(",")) {
            return NextResponse.json({ error: "Missing or invalid image data" }, { status: 400 });
        }
        if (image.length > MAX_IMAGE_CHARS) {
            return NextResponse.json({ error: "Image too large" }, { status: 413 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Extract all exam questions from this image. 
            Format the output as a JSON array of objects.
            Each object should have:
            - type: "MCQ" (always MCQ for now)
            - text: The question text
            - options: An array of 4 strings for choices
            - correctOption: The index (0-3) of the correct answer (guess if not certain, but try to be accurate)
            - points: 10 (default)

            Return ONLY the raw JSON array. No markdown code blocks, no preamble.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image.split(",")[1], // Remove "data:image/jpeg;base64," prefix
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = await result.response;
        let text = response.text().trim();

        // Clean up markdown code blocks if Gemini ignores the "ONLY raw JSON" instruction
        if (text.startsWith("```json")) {
            text = text.replace(/```json\n?/, "").replace(/\n?```/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/```\n?/, "").replace(/\n?```/, "");
        }

        try {
            const questions = JSON.parse(text);
            
            await logActivity({
                userId: user.id,
                schoolId: user.schoolId as string,
                action: 'EXTRACT_EXAM',
                resourceType: 'exam',
                resourceId: id,
                ip: getIp(req)
            });
            return NextResponse.json({ questions });
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", text);
            return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });
        }

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
    }
}
