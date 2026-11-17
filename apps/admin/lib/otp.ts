import { prisma } from './prisma';
import { hmacSha256 } from './auth';

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

function secureRandomInt(min: number, max: number): number {
    const range = max - min + 1;
    const bytesNeeded = 4;
    const maxValid = Math.floor(0xffffffff / range) * range;
    const array = new Uint32Array(1);

    while (true) {
        crypto.getRandomValues(array);
        const val = array[0];
        if (val < maxValid) {
            return min + (val % range);
        }
    }
}

export function generate6DigitCode(): string {
    return String(secureRandomInt(0, 999_999)).padStart(6, '0');
}

/**
 * Creates an OTP challenge for an admin user.
 */
export async function createOtpChallenge(adminId: string): Promise<{ challengeId: string; code: string }> {
    const code = generate6DigitCode();
    const challengeId = crypto.randomUUID();
    const codeHash = await hmacSha256(`otp:${challengeId}:${code}`);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate prior active challenges for this admin
    await prisma.adminOtpChallenge.deleteMany({
        where: { adminId },
    });

    await prisma.adminOtpChallenge.create({
        data: {
            id: challengeId,
            adminId,
            codeHash,
            attempts: 0,
            expiresAt,
        },
    });

    return { challengeId, code };
}

/**
 * Verifies a submitted OTP challenge code.
 */
export async function verifyOtpChallenge(
    challengeId: string,
    submittedCode: string
): Promise<{ valid: boolean; adminId?: string; reason?: string }> {
    const challenge = await prisma.adminOtpChallenge.findUnique({
        where: { id: challengeId },
        include: { admin: true },
    });

    if (!challenge) {
        return { valid: false, reason: 'Invalid or expired verification challenge.' };
    }

    if (Date.now() > challenge.expiresAt.getTime()) {
        await prisma.adminOtpChallenge.delete({ where: { id: challengeId } });
        return { valid: false, reason: 'Verification code has expired. Please request a new code.' };
    }

    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
        await prisma.adminOtpChallenge.delete({ where: { id: challengeId } });
        return { valid: false, reason: 'Maximum code attempts exceeded. Please login again.' };
    }

    const expectedHash = await hmacSha256(`otp:${challengeId}:${submittedCode.trim()}`);
    if (expectedHash !== challenge.codeHash) {
        await prisma.adminOtpChallenge.update({
            where: { id: challengeId },
            data: { attempts: { increment: 1 } },
        });
        const remaining = MAX_OTP_ATTEMPTS - (challenge.attempts + 1);
        return { valid: false, reason: `Incorrect code. ${remaining} attempt(s) remaining.` };
    }

    // Success: delete single-use challenge
    await prisma.adminOtpChallenge.delete({ where: { id: challengeId } });

    return { valid: true, adminId: challenge.adminId };
}

/**
 * Sends OTP email using Resend or SMTP fallback.
 */
export async function sendAdminOtpEmail(toEmail: string, code: string, adminName: string): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'LUCY Security <noreply@5-cn.net>';

    if (!apiKey) {
        // In local development or test without API key, log to console
        console.warn(`[Admin OTP Dev] Generated code for ${toEmail}: ${code}`);
        return true;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [toEmail],
                subject: 'LUCY Admin Portal: Your 2FA Verification Code',
                text: `Hello ${adminName},\n\nYour one-time authentication code for the LUCY OS Admin Portal is: ${code}\n\nThis code will expire in 10 minutes. If you did not initiate this request, notify the security team immediately.`,
                html: `
                    <div style="font-family: sans-serif; background: #070709; color: #f4f4f5; padding: 32px; border-radius: 8px;">
                        <h2 style="color: #10b981; margin-bottom: 8px;">LUCY Admin Portal Verification</h2>
                        <p style="color: #a1a1aa;">Hello ${adminName},</p>
                        <p style="color: #d4d4d8;">Enter the following 6-digit one-time code to complete your administrator sign-in:</p>
                        <div style="background: #18181b; padding: 18px; border-radius: 6px; font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #34d399; text-align: center; margin: 24px 0;">
                            ${code}
                        </div>
                        <p style="color: #71717a; font-size: 13px;">This code expires in 10 minutes. If you did not request this sign-in, change your credentials immediately.</p>
                    </div>
                `,
            }),
        });

        return res.ok;
    } catch (err) {
        console.error('[Admin OTP Email Exception]', err);
        return false;
    }
}
