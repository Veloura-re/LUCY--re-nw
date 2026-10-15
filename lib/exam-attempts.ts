/**
 * Server-side exam attempt lifecycle.
 *
 * ExamAttempt has no unique constraint on (examId, studentId), so correctness is enforced here:
 * every state change runs inside a transaction holding a Postgres advisory lock keyed by the
 * exam and student. That serialises concurrent starts and submissions, which prevents duplicate
 * attempts, replayed submissions and double grading.
 *
 * Status flow: IN_PROGRESS -> GRADING (claimed) -> SUBMITTED. A GRADING claim that is older than
 * STALE_CLAIM_MS is treated as abandoned (for example a crashed request) and may be re-claimed.
 */

import type { PrismaClient } from '@prisma/client';

export const STALE_CLAIM_MS = 10 * 60 * 1000;
/** Allowance for network latency and clock skew when enforcing the time limit. */
export const SUBMIT_GRACE_MS = 2 * 60 * 1000;

export interface ClaimResult {
    ok: boolean;
    attemptId: string;
    status: number;
    error: string;
}

const fail = (status: number, error: string): ClaimResult => ({ ok: false, attemptId: '', status, error });

async function lockAttempt(tx: any, examId: string, studentId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`exam-attempt:${examId}:${studentId}`}))`;
}

/** Remaining seconds for an exam given when the attempt started (never negative). */
export function remainingSeconds(durationMinutes: number | null | undefined, startedAt: Date | null | undefined, now: Date = new Date()): number {
    const total = (durationMinutes || 60) * 60;
    if (!startedAt) return total;
    const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    return Math.max(0, total - elapsed);
}

/**
 * Returns the student's attempt for the exam, creating an IN_PROGRESS one on first call.
 * Idempotent: repeated calls return the same attempt and never reset its start time.
 */
export async function ensureAttemptStarted(prisma: PrismaClient, examId: string, studentId: string) {
    return prisma.$transaction(async (tx) => {
        await lockAttempt(tx, examId, studentId);
        const existing = await tx.examAttempt.findFirst({
            where: { examId, studentId },
            orderBy: { startedAt: 'asc' }
        });
        if (existing) return existing;
        return tx.examAttempt.create({
            data: { examId, studentId, startedAt: new Date(), status: 'IN_PROGRESS' }
        });
    });
}

/**
 * Atomically claims the attempt for grading. Only one concurrent caller can succeed, an already
 * submitted attempt is refused, and the time limit is enforced from the recorded start time.
 */
export async function claimAttemptForGrading(
    prisma: PrismaClient,
    exam: { id: string; duration: number | null },
    studentId: string,
    now: Date = new Date()
): Promise<ClaimResult> {
    return prisma.$transaction(async (tx) => {
        await lockAttempt(tx, exam.id, studentId);

        const attempts = await tx.examAttempt.findMany({
            where: { examId: exam.id, studentId },
            orderBy: { startedAt: 'asc' }
        });

        if (attempts.some((a) => a.status === 'SUBMITTED')) {
            return fail(409, 'Assessment already submitted');
        }

        let attempt = attempts[0];

        if (attempt) {
            const meta = (attempt.metadata as any) || {};
            const claimedAt = meta.gradingClaimedAt ? new Date(meta.gradingClaimedAt).getTime() : 0;
            if (attempt.status === 'GRADING' && now.getTime() - claimedAt < STALE_CLAIM_MS) {
                return fail(409, 'Submission is already being processed');
            }
            if (exam.duration && attempt.startedAt) {
                const deadline = attempt.startedAt.getTime() + exam.duration * 60 * 1000 + SUBMIT_GRACE_MS;
                if (now.getTime() > deadline) {
                    return fail(409, 'The time limit for this assessment has passed');
                }
            }
            attempt = await tx.examAttempt.update({
                where: { id: attempt.id },
                data: { status: 'GRADING', metadata: { ...meta, gradingClaimedAt: now.toISOString() } }
            });
        } else {
            // Submitted without a recorded start (for example before this tracking existed).
            attempt = await tx.examAttempt.create({
                data: {
                    examId: exam.id,
                    studentId,
                    startedAt: now,
                    status: 'GRADING',
                    metadata: { gradingClaimedAt: now.toISOString() }
                }
            });
        }

        return { ok: true, attemptId: attempt.id, status: 200, error: '' };
    });
}

/** Returns a claimed attempt to IN_PROGRESS after a grading failure so the student can retry. */
export async function releaseAttemptClaim(prisma: PrismaClient, attemptId: string) {
    await prisma.examAttempt.updateMany({
        where: { id: attemptId, status: 'GRADING' },
        data: { status: 'IN_PROGRESS' }
    });
}
