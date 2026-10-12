import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeHtml, singleLine, isValidEmail } from "@/lib/security";
import { rateLimitShared } from '@/lib/rate-limit';

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const MAX_TYPE = 100;
const MAX_DESCRIPTION = 10000;

export async function POST(req: Request) {
    const limited = await rateLimitShared(req, "public/security-report", 3, 10 * 60_000);
    if (limited) return limited;

    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

        if (!isValidEmail(body.email) || typeof body.vulnerabilityType !== "string"
            || typeof body.severity !== "string" || typeof body.description !== "string") {
            return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
        }

        const email = body.email;
        const vulnerabilityType = singleLine(body.vulnerabilityType).slice(0, MAX_TYPE);
        const severity = singleLine(body.severity).toUpperCase();
        const description = body.description.trim().slice(0, MAX_DESCRIPTION);

        if (!vulnerabilityType || !description || !SEVERITIES.includes(severity)) {
            return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
        }

        const reportId = globalThis.crypto.randomUUID();
        const encoder = new TextEncoder();
        const data = encoder.encode(reportId + description);
        const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // Save to database
        const report = await (prisma as any).securityReport.create({
            data: {
                id: reportId,
                email,
                vulnerabilityType,
                severity,
                description,
                hash
            }
        });

        console.log(`[Security Vault] New vulnerability report received and logged to database. ID: ${reportId}, Hash: ${hash}`);

        // Dispatch alert to security operations
        try {
            const { sendEmail } = await import("@/lib/email");
            await sendEmail({
                to: "security@5-cn.net",
                subject: `SECURITY ALERT: ${severity} - ${vulnerabilityType} reported by ${email}`,
                html: `
                    <div style="font-family: sans-serif; padding: 24px; background: #0a0a0a; color: #fff; border-radius: 8px;">
                        <h2 style="color: #f97316;">VULNERABILITY DISCLOSURE RECEIVED</h2>
                        <p><strong>Severity:</strong> ${escapeHtml(severity)}</p>
                        <p><strong>Type:</strong> ${escapeHtml(vulnerabilityType)}</p>
                        <p><strong>Researcher:</strong> ${escapeHtml(email)}</p>
                        <p><strong>Report Hash:</strong> ${hash}</p>
                        <hr style="border: 0; border-top: 1px solid #333; margin: 16px 0;" />
                        <p><strong>Description / PoC:</strong></p>
                        <pre style="background: #18181b; padding: 12px; border-radius: 4px; white-space: pre-wrap; color: #e4e4e7;">${escapeHtml(description)}</pre>
                    </div>
                `,
                replyTo: email
            });
        } catch (mailErr) {
            console.error("[Security Vault] Failed to dispatch security alert email:", mailErr);
        }

        return NextResponse.json({
            success: true,
            hash: report.hash,
            timestamp: report.createdAt.toISOString()
        });

    } catch (error: any) {
        console.error("Security Report Error:", error);
        return NextResponse.json({ error: "Internal message failure" }, { status: 500 });
    }
}
