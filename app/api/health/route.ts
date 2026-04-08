import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Ultra-lightweight health check endpoint to verify Edge Worker connectivity and latency.
 */
export async function GET() {
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
