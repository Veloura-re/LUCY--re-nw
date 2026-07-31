import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { callsign, email, message } = await req.json() as any;

        // Recipient fixed as per user request
        const recipient = "lucyosck21@gmail.com";

        // Save to database
        await (prisma as any).wantsAccess.create({
            data: {
                callsign: callsign || "UNIDENTIFIED_UNIT",
                email: email || "NO_REPLY_PROTOCOL",
                message: message || "Empty Transmission Packet."
            }
        });

        const html = `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #fff; padding: 40px; border: 1px solid #147A52; border-radius: 12px;">
                <h1 style="color: #00ff9d; font-size: 24px; text-transform: uppercase; letter-spacing: 0.2em;">Establish Connection: Handshake</h1>
                <p style="color: #888; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">New connection request received.</p>
                <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Callsign / Identifier</p>
                    <p style="font-size: 18px; margin: 4px 0;">${callsign || "UNIDENTIFIED_UNIT"}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Direct Comm Link</p>
                    <p style="font-size: 16px; margin: 4px 0;">${email || "NO_REPLY_PROTOCOL"}</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: #00ff9d; font-weight: bold; font-size: 12px; text-transform: uppercase;">Payload Content</p>
                    <p style="font-size: 14px; line-height: 1.6; color: #ccc;">${message || "Empty Transmission Packet."}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
                <p style="font-size: 10px; color: #444; text-align: center;">LUCY OS // INITIALIZATION PROTOCOL // SECURE TRANSIT</p>
            </div>
        `;

        await sendEmail({
            to: recipient,
            subject: `UPLINK: connection request from ${callsign || 'Unknown'}`,
            html: html,
            replyTo: email || undefined
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Connection API Error]:", error);
        return NextResponse.json(
            { error: "Transmission failed. Error: " + error.message },
            { status: 500 }
        );
    }
}
