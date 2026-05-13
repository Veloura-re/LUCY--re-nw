import { NextResponse } from 'next/server';
import { appendDebugSessionNdjson } from '@/lib/debug-session-log';

export const runtime = 'nodejs';

/**
 * Ultra-lightweight health check endpoint to verify Edge Worker connectivity and latency.
 */
export async function GET() {
    // #region agent log
    appendDebugSessionNdjson({
        sessionId: '04823b',
        location: 'app/api/health/route.ts:GET',
        message: 'api_health_invoked',
        data: { nextRuntime: process.env.NEXT_RUNTIME ?? null },
        hypothesisId: 'H-api',
        timestamp: Date.now(),
    });
    // #endregion
    return NextResponse.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        region: process.env.VERCEL_REGION || 'edge-node'
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}
