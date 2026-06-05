const SESSION = "04823b";

/** Browser → dev server NDJSON sink (see `/api/debug-ingest`). */
export function agentDebugLog(entry: {
    location: string;
    message: string;
    data?: Record<string, unknown>;
    hypothesisId?: string;
    runId?: string;
}) {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    const body = {
        sessionId: SESSION,
        timestamp: Date.now(),
        ...entry,
    };
    fetch("/api/debug-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }).catch(() => {});
}
