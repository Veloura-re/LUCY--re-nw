import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        let logs: any[] = [];
        try {
            logs = await prisma.$queryRaw<any[]>`
                SELECT id, ip_address, email, status, created_at 
                FROM auth_audit_logs 
                ORDER BY created_at DESC 
                LIMIT 100
            `;
        } catch (e) {
            console.error("Schema not applied yet", e);
        }
        
        return NextResponse.json({ logs });
    } catch (e: any) {
        console.error("Failed to fetch audit logs", e);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
