import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';
import { generateAssignmentDraft, analyzeStudentTask, preEvaluateSubmission, summarizeSubmission, generateInstitutionalInsight, analyzeTaskForParent } from '@/lib/ai';

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
            const draft = await generateAssignmentDraft(context);
            return NextResponse.json({ draft });
        }

        if (mode === 'analyze') {
            const analysis = await analyzeStudentTask(context);
            return NextResponse.json({ analysis });
        }

        if (mode === 'pre-eval') {
            const evaluation = await preEvaluateSubmission(context.assignment, context.content);
            return NextResponse.json({ evaluation });
        }

        if (mode === 'summarize') {
            if (user.role === 'STUDENT' || user.role === 'PARENT') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const summary = await summarizeSubmission(context.content);
            return NextResponse.json({ summary });
        }

        if (mode === 'institutional-insight') {
            if (user.role !== 'PRINCIPAL' && user.role !== 'HOMEROOM') { // Adjust roles as needed
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
            const insight = await generateInstitutionalInsight(context);
            return NextResponse.json({ insight });
        }

        if (mode === 'parent-analysis') {
            const analysis = await analyzeTaskForParent(context);
            return NextResponse.json({ analysis });
        }

        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    } catch (e: any) {
        return handleApiError(e);
    }
}
