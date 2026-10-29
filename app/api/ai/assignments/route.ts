import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { generateAssignmentDraft, analyzeStudentTask, preEvaluateSubmission, summarizeSubmission, generateInstitutionalInsight, analyzeTaskForParent } from '@/lib/ai';
import { createAiObservationContext } from '@/lib/ai-observability';

import { logActivity } from '@/lib/audit';
export async function POST(request: Request) {
    try {
        const user = await requireRole(['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'STUDENT', 'PARENT']);
        const body = await request.json() as any;
        const { mode, context } = body;

        if (mode === 'generate') {
            // Only staff can generate assignments
            if (user.role === 'STUDENT' || user.role === 'PARENT') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const draft = await generateAssignmentDraft(context, createAiObservationContext({ distinctId: user.id, spanName: 'assignment_draft' }));
            
        // Audit log
        try {
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = user?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ draft });
        }

        if (mode === 'analyze') {
            const analysis = await analyzeStudentTask(context, createAiObservationContext({ distinctId: user.id, spanName: 'assignment_analysis' }));
            return NextResponse.json({ analysis });
        }

        if (mode === 'pre-eval') {
            const evaluation = await preEvaluateSubmission(context.assignment, context.content, createAiObservationContext({ distinctId: user.id, spanName: 'assignment_pre_evaluation' }));
            return NextResponse.json({ evaluation });
        }

        if (mode === 'summarize') {
            if (user.role === 'STUDENT' || user.role === 'PARENT') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const summary = await summarizeSubmission(context.content, createAiObservationContext({ distinctId: user.id, spanName: 'assignment_summary' }));
            return NextResponse.json({ summary });
        }

        if (mode === 'institutional-insight') {
            if (user.role !== 'PRINCIPAL' && user.role !== 'HOMEROOM') { // Adjust roles as needed
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const insight = await generateInstitutionalInsight(context, createAiObservationContext({ distinctId: user.id, spanName: 'institutional_assignment_insight' }));
            return NextResponse.json({ insight });
        }

        if (mode === 'parent-analysis') {
            const analysis = await analyzeTaskForParent(context, createAiObservationContext({ distinctId: user.id, spanName: 'parent_assignment_analysis' }));
            return NextResponse.json({ analysis });
        }

        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    } catch (e: any) {
        return handleApiError(e);
    }
}
