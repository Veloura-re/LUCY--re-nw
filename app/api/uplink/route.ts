import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { escapeHtml, singleLine, isValidEmail } from "@/lib/security";
import { rateLimitShared } from '@/lib/rate-limit';

const CATEGORY_RECIPIENTS: Record<string, string> = {
    support: "support@5-cn.net",
    sales: "admin@5-cn.net",
    admin: "admin@5-cn.net",
    billing: "billing@5-cn.net",
    security: "security@5-cn.net",
};
const DEFAULT_RECIPIENT = "contact@5-cn.net";

const MAX_CALLSIGN = 100;
const MAX_MESSAGE = 5000;

export async function POST(req: NextRequest) {
    const limited = await rateLimitShared(req, "uplink", 3, 10 * 60_000);
    if (limited) return limited;

    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

        const callsign = typeof body.callsign === "string" ? singleLine(body.callsign).slice(0, MAX_CALLSIGN) : "";
        const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
        const email = isValidEmail(body.email) ? body.email : "";
        const category = typeof body.category === "string" ? body.category : "";

        if (!message) {
            return NextResponse.json({ error: "A message is required." }, { status: 400 });
        }

        const recipient = CATEGORY_RECIPIENTS[category] ?? DEFAULT_RECIPIENT;
        const safeCallsign = callsign || "UNIDENTIFIED_UNIT";
        const safeEmail = email || "NO_REPLY_PROTOCOL";

        await prisma.wantsAccess.create({
            data: { callsign: safeCallsign, email: safeEmail, message }
        });

        const html = `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #fff; padding: 40px; border: 1px solid #147A52; border-radius: 12px;">
                <h1 style="color: #00ff9d; font-size: 24px; text-transform: uppercase; letter-spacing: 0.2em;">Establish Connection: Handshake</h1>
                <p style="color: #888; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">New connection request received.</p>
                <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Callsign / Identifier</p>
                    <p style="font-size: 18px; margin: 4px 0;">${escapeHtml(safeCallsign)}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Direct Comm Link</p>
                    <p style="font-size: 16px; margin: 4px 0;">${escapeHtml(safeEmail)}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Payload Content</p>
                    <p style="font-size: 14px; line-height: 1.6; color: #ccc; white-space: pre-wrap;">${escapeHtml(message)}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
                <p style="font-size: 10px; color: #444; text-align: center;">LUCY OS // INITIALIZATION PROTOCOL // SECURE TRANSIT</p>
            </div>
        `;

        await sendEmail({
            to: recipient,
            subject: `UPLINK: connection request from ${safeCallsign}`,
            html,
            replyTo: email || undefined
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[Connection API Error]:", error);
        return NextResponse.json({ error: "Transmission failed. Please try again later." }, { status: 500 });
    }
}
