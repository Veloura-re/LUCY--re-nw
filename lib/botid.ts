import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';

/**
 * Server-side Vercel BotID verification.
 * Blocks automated malicious bots while allowing legitimate traffic through.
 */
export async function verifyBotId(): Promise<{ isBot: boolean; response?: NextResponse }> {
    try {
        const verification = await checkBotId();
        if (verification?.isBot) {
            return {
                isBot: true,
                response: NextResponse.json(
                    { error: 'Access denied. Automated traffic detected.' },
                    { status: 403 }
                ),
            };
        }
    } catch {
        // Fallback: When BotID headers are not available (e.g. test runner, local dev), continue cleanly
    }

    return { isBot: false };
}
