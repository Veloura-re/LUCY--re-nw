import { NextResponse } from 'next/server';
import { generateExamQuestions } from '@/lib/ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subject, topic, gradeLevel, count, type } = body;

        if (!subject || !topic || !gradeLevel) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const maxCount = Math.min(parseInt(count || '5'), 20); // Cap at 20 questions

        const questions = await generateExamQuestions({
            subject,
            topic,
            gradeLevel,
            count: maxCount,
            type: type || 'MIXED'
        });

        return NextResponse.json({ questions });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
    }
}
