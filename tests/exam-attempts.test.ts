import { claimAttemptForGrading, ensureAttemptStarted, remainingSeconds, STALE_CLAIM_MS, SUBMIT_GRACE_MS } from "@/lib/exam-attempts";

/** Minimal in-memory Prisma double supporting the calls the lifecycle uses. Transactions are serialised. */
function fakePrisma(initial: any[] = []) {
    const attempts = [...initial];
    let seq = 0;
    let chain: Promise<unknown> = Promise.resolve();
    const tx: any = {
        $queryRaw: async () => [],
        examAttempt: {
            findFirst: async ({ where }: any) => attempts.find((a) => a.examId === where.examId && a.studentId === where.studentId) ?? null,
            findMany: async ({ where }: any) => attempts.filter((a) => a.examId === where.examId && a.studentId === where.studentId),
            create: async ({ data }: any) => { const row = { id: `a${++seq}`, ...data }; attempts.push(row); return row; },
            update: async ({ where, data }: any) => { const row = attempts.find((a) => a.id === where.id)!; Object.assign(row, data); return row; },
            updateMany: async ({ where, data }: any) => { const rows = attempts.filter((a) => a.id === where.id && a.status === where.status); rows.forEach((r) => Object.assign(r, data)); return { count: rows.length }; },
        },
    };
    const prisma: any = {
        ...tx,
        $transaction: (fn: any) => { const run = chain.then(() => fn(tx)); chain = run.catch(() => undefined); return run; },
    };
    return { prisma, attempts };
}

const exam = { id: "e1", duration: 30 };

describe("exam attempt lifecycle", () => {
    it("start is idempotent and keeps the original start time", async () => {
        const { prisma, attempts } = fakePrisma();
        const first = await ensureAttemptStarted(prisma, "e1", "s1");
        const second = await ensureAttemptStarted(prisma, "e1", "s1");
        expect(second.id).toBe(first.id);
        expect(attempts).toHaveLength(1);
    });

    it("only one of two concurrent submissions can claim the attempt", async () => {
        const { prisma, attempts } = fakePrisma();
        await ensureAttemptStarted(prisma, "e1", "s1");
        const results = await Promise.all([
            claimAttemptForGrading(prisma, exam, "s1"),
            claimAttemptForGrading(prisma, exam, "s1"),
        ]);
        expect(results.filter((r) => r.ok)).toHaveLength(1);
        expect(results.find((r) => !r.ok)!.status).toBe(409);
        expect(attempts).toHaveLength(1);
    });

    it("refuses a replay after submission", async () => {
        const { prisma } = fakePrisma([{ id: "a0", examId: "e1", studentId: "s1", status: "SUBMITTED", startedAt: new Date() }]);
        const result = await claimAttemptForGrading(prisma, exam, "s1");
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/already submitted/);
    });

    it("enforces the time limit from the recorded start, with a grace period", async () => {
        const start = new Date("2026-01-01T10:00:00Z");
        const inGrace = new Date(start.getTime() + 30 * 60_000 + SUBMIT_GRACE_MS - 1000);
        const late = new Date(start.getTime() + 30 * 60_000 + SUBMIT_GRACE_MS + 1000);

        const a = fakePrisma([{ id: "a1", examId: "e1", studentId: "s1", status: "IN_PROGRESS", startedAt: start }]);
        expect((await claimAttemptForGrading(a.prisma, exam, "s1", inGrace)).ok).toBe(true);

        const b = fakePrisma([{ id: "a1", examId: "e1", studentId: "s1", status: "IN_PROGRESS", startedAt: start }]);
        const lateResult = await claimAttemptForGrading(b.prisma, exam, "s1", late);
        expect(lateResult.ok).toBe(false);
        expect(lateResult.error).toMatch(/time limit/);
    });

    it("re-claims an abandoned GRADING claim but not a fresh one", async () => {
        const now = new Date("2026-01-01T10:00:00Z");
        const stale = new Date(now.getTime() - STALE_CLAIM_MS - 1000).toISOString();
        const fresh = new Date(now.getTime() - 1000).toISOString();

        const a = fakePrisma([{ id: "a1", examId: "e1", studentId: "s1", status: "GRADING", startedAt: now, metadata: { gradingClaimedAt: stale } }]);
        expect((await claimAttemptForGrading(a.prisma, { id: "e1", duration: null }, "s1", now)).ok).toBe(true);

        const b = fakePrisma([{ id: "a1", examId: "e1", studentId: "s1", status: "GRADING", startedAt: now, metadata: { gradingClaimedAt: fresh } }]);
        expect((await claimAttemptForGrading(b.prisma, { id: "e1", duration: null }, "s1", now)).ok).toBe(false);
    });

    it("creates an attempt on the fly when none was recorded", async () => {
        const { prisma, attempts } = fakePrisma();
        const result = await claimAttemptForGrading(prisma, exam, "s1");
        expect(result.ok).toBe(true);
        expect(attempts[0].status).toBe("GRADING");
    });
});

describe("remainingSeconds", () => {
    it("counts down from the start and never goes negative", () => {
        const start = new Date("2026-01-01T10:00:00Z");
        expect(remainingSeconds(30, start, new Date(start.getTime() + 10 * 60_000))).toBe(20 * 60);
        expect(remainingSeconds(30, start, new Date(start.getTime() + 99 * 60_000))).toBe(0);
        expect(remainingSeconds(null, null)).toBe(3600);
    });
});
