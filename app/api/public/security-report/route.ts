import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as any;
        const { email, vulnerabilityType, severity, description } = body;

        if (!email || !vulnerabilityType || !severity || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const reportId = crypto.randomUUID();
        const hash = crypto.createHash("sha256").update(reportId + description).digest("hex");
        const timestamp = new Date().toISOString();

        const report = {
            id: reportId,
            timestamp,
            email,
            vulnerabilityType,
            severity,
            description,
            hash
        };

        // Save to workspace storage
        const storageDir = path.join(process.cwd(), "storage");
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        const storageFile = path.join(storageDir, "security-reports.json");
        let currentReports = [];
        if (fs.existsSync(storageFile)) {
            try {
                currentReports = JSON.parse(fs.readFileSync(storageFile, "utf8"));
            } catch (e) {
                currentReports = [];
            }
        }
        currentReports.push(report);
        fs.writeFileSync(storageFile, JSON.stringify(currentReports, null, 2), "utf8");

        console.log(`[Security Vault] New vulnerability report received. ID: ${reportId}, Hash: ${hash}`);

        return NextResponse.json({
            success: true,
            hash,
            timestamp
        });

    } catch (error: any) {
        console.error("Security Report Error:", error);
        return NextResponse.json({ error: "Internal transmission failure" }, { status: 500 });
    }
}
