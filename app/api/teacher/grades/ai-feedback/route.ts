import { NextResponse } from 'next/server';
import { generateGradeFeedback } from '@/lib/ai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { score, maxScore, subject, previousContext } = body;

        if (score === undefined || maxScore === undefined || !subject) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const feedback = await generateGradeFeedback(score, maxScore, subject, previousContext);

        return NextResponse.json({ feedback });

    } catch (error: any) {
        console.error('[AI Grading Feedback Error]', error);
        return NextResponse.json({ error: 'Failed to generate AI feedback', details: error.message }, { status: 500 });
    }
}
