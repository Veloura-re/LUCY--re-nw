<<<<<<< HEAD
=======
import { NextResponse } from 'next/server';
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
import { prisma } from '@/lib/prisma';
import { rateLimit, secureJson } from '@/lib/security';

export async function POST(request: Request) {
    const limit = rateLimit(request, "auth/register-admin", 3); // Very strict for admin reg
    if (limit) return limit;

    const { userId, email, name, secretKey } = await request.json();

    // Check against ENV variable (REQUIRED)
    const VALID_SECRET = process.env.ADMIN_SECRET_KEY;

    if (!VALID_SECRET) {
        console.error("ADMIN_SECRET_KEY is not configured in environment variables.");
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    if (secretKey?.trim() !== VALID_SECRET?.trim()) {
        return secureJson({ error: 'Invalid Administration Key.' }, 403);
    }

    try {
        const user = await prisma.user.create({
            data: {
                id: userId,
                email,
                name,
                role: 'SUPERADMIN',
                verified: true,
            }
        });
        return secureJson({ user });
    } catch (e: any) {
        console.error(e);
        return secureJson({ error: "Internal Server Error" }, 500); // Masked
    }
}
