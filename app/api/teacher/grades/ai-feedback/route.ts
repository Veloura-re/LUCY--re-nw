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

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'grade', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ feedback });

    } catch (error: any) {
        console.error('[AI Grading Feedback Error]', error);
        return NextResponse.json({ error: 'Failed to generate AI feedback', details: error.message }, { status: 500 });
    }
}
