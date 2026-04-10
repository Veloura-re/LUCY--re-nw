import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { getFamilyChildren } from '@/lib/dashboard-data';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['PARENT']);

        // Use the centralized, cached utility to ensure logic parity with SSR
        const students = await getFamilyChildren(dbUser.id);

        return NextResponse.json({ students });


        return NextResponse.json({ students });
    } catch (e) {
        return handleApiError(e);
    }
}
