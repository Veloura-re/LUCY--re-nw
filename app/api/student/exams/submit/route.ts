import { NextResponse } from 'next/server';
import { requireRole, handleApiError } from '@/lib/security';

/**
 * Retired endpoint. It graded with a different question model than the exam editor produces and
 * returned the stored answers to the caller. Submissions go through POST /api/student/exams/[id]/submit.
 */
export async function POST() {
    try {
        await requireRole(['STUDENT']);
        return NextResponse.json(
            { error: 'This endpoint has been retired. Submit to /api/student/exams/{examId}/submit.' },
            { status: 410 }
        );
    } catch (e) {
        return handleApiError(e);
    }
}
