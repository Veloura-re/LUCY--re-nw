import { NextResponse } from 'next/server';
import { generateExamQuestions } from '@/lib/ai';
import { createAiObservationContext } from '@/lib/ai-observability';
import { requireRole, handleApiError } from '@/lib/security';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    try {
        // Auth guard: only teachers and above can generate AI exams
        const authUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER', 'HOMEROOM']);

        const body: any = await request.json().catch(() => ({}));
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
        }, createAiObservationContext({ distinctId: authUser.id, spanName: 'exam_question_generation' }));

        // Non-blocking audit
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            await logActivity({ userId: authUser.id, action: 'GENERATE', resourceType: 'exam', ip: _ip });
        } catch { /* non-blocking */ }

        return NextResponse.json({ questions });
    } catch (error: any) {
        return handleApiError(error);
    }
}
