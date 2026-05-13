import { NextResponse } from "next/server";
import { appendDebugSessionNdjson } from "@/lib/debug-session-log";

/** Dev-only NDJSON sink so browser instrumentation can persist logs without localhost ingest. */
export async function POST(req: Request) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "disabled" }, { status: 403 });
    }
    let body: Record<string, unknown>;
    try {
        body = (await req.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    try {
        appendDebugSessionNdjson(body);
    } catch {
        return NextResponse.json({ error: "write failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
