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

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'GENERATE', resourceType: 'exam', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ questions });
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
    }
}
