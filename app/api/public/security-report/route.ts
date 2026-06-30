import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as any;
        const { email, vulnerabilityType, severity, description } = body;

        if (!email || !vulnerabilityType || !severity || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const reportId = crypto.randomUUID();
        const hash = crypto.createHash("sha256").update(reportId + description).digest("hex");

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
        return NextResponse.json({ error: "Internal transmission failure" }, { status: 500 });
    }
}
