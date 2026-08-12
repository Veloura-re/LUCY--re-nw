import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to convert array buffer to hex string
function buf2hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as any;
        const { email, vulnerabilityType, severity, description } = body;

        if (!email || !vulnerabilityType || !severity || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const reportId = globalThis.crypto.randomUUID();
        const encoder = new TextEncoder();
        const data = encoder.encode(reportId + description);
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
        const hash = buf2hex(hashBuffer);

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
