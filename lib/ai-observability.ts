import { randomUUID } from 'crypto';
import { PostHog } from 'posthog-node';
import { GEMINI_MODEL } from './ai-config';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if ((!posthogKey || !posthogHost) && process.env.NODE_ENV === 'development') {
    const missingVariable = posthogKey ? 'NEXT_PUBLIC_POSTHOG_HOST' : 'NEXT_PUBLIC_POSTHOG_KEY';
    throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
    );
}

const posthog = posthogKey && posthogHost
    ? new PostHog(posthogKey, {
        host: posthogHost,
        privacyMode: false,
        enableExceptionAutocapture: true,
        flushAt: 1,
        flushInterval: 0,
    })
    : null;

const serverProcessSessionId = `lucy-server-${randomUUID()}`;

export interface AiObservationContext {
    distinctId?: string;
    traceId: string;
    sessionId: string;
    spanName: string;
}

export function createAiObservationContext({
    distinctId,
    spanName,
}: Pick<AiObservationContext, 'distinctId' | 'spanName'>): AiObservationContext {
    return {
        distinctId,
        traceId: randomUUID(),
        sessionId: serverProcessSessionId,
        spanName,
    };
}

type GeminiUsageMetadata = {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
};

export async function captureGeminiGeneration({
    input,
    output,
    context,
    startedAt,
    usageMetadata,
    stream = false,
    timeToFirstToken,
}: {
    input: unknown;
    output: string;
    context?: AiObservationContext;
    startedAt: number;
    usageMetadata?: GeminiUsageMetadata;
    stream?: boolean;
    timeToFirstToken?: number;
}) {
    const activeContext = context ?? createAiObservationContext({ spanName: 'gemini_generation' });
    if (!posthog) return;

    try {
        posthog.capture({
            distinctId: activeContext.distinctId,
            event: '$ai_generation',
            properties: {
                $ai_trace_id: activeContext.traceId,
                $ai_session_id: activeContext.sessionId,
                $ai_span_id: randomUUID(),
                $ai_span_name: activeContext.spanName,
                $ai_model: GEMINI_MODEL,
                $ai_provider: 'gemini',
                $ai_input: [{ role: 'user', content: input }],
                $ai_input_tokens: usageMetadata?.promptTokenCount,
                $ai_output_choices: [{ role: 'assistant', content: output }],
                $ai_output_tokens: usageMetadata?.candidatesTokenCount,
                $ai_latency: (Date.now() - startedAt) / 1000,
                $ai_stream: stream || undefined,
                $ai_time_to_first_token: timeToFirstToken,
            },
        });
        await posthog.flush();
    } catch (error) {
        console.warn('[AI Observability] Failed to capture Gemini generation', error);
    }
}

export async function observeGeminiCall<T extends { response: unknown }>(
    operation: () => Promise<T>,
    input: unknown,
    context?: AiObservationContext,
): Promise<T> {
    const startedAt = Date.now();
    const result = await operation();
    const response = await result.response as {
        text?: () => string;
        usageMetadata?: GeminiUsageMetadata;
    };

    await captureGeminiGeneration({
        input,
        output: response.text?.() ?? '',
        context,
        startedAt,
        usageMetadata: response.usageMetadata,
    });

    return result;
}
