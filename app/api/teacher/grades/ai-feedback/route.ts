import { NextResponse } from 'next/server';
import { generateGradeFeedback } from '@/lib/ai';
import { createAiObservationContext } from '@/lib/ai-observability';
import { requireRole, STAFF_ROLES } from '@/lib/security';
import { logActivity, getIp } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const user = await requireRole(STAFF_ROLES);

        const body = (await request.json()) as {
            score?: number;
            maxScore?: number;
            subject?: string;
            previousContext?: any;
        };
        const { score, maxScore, subject, previousContext } = body;

        if (score === undefined || maxScore === undefined || !subject) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const feedback = await generateGradeFeedback(score, maxScore, subject, previousContext, createAiObservationContext({ distinctId: user.id, spanName: 'grade_feedback' }));

        if (user?.id) {
            logActivity({
                userId: user.id,
                action: 'CREATE',
                resourceType: 'ai_grade_feedback',
                ip: getIp(request),
            }).catch(() => {});
        }

        return NextResponse.json({ feedback });
    } catch (error: any) {
        console.error('[AI Grading Feedback Error]', error);
        return NextResponse.json({ error: 'Failed to generate AI feedback' }, { status: 500 });
    }
}
