import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from '@/lib/security';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractAndParseJson } from '@/lib/ai';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: Request) {
    try {
        const authUser = await requireAuth();

        const body: any = await req.json();
        const { invoiceId, method = "CARD", reference, receiptImage } = body;

        if (!invoiceId) return new NextResponse("Missing Invoice ID", { status: 400 });

        const dbUser = await prisma.user.findUnique({
            where: { id: authUser.id },
            include: { parentLinks: true }
        });

        if (!dbUser) return new NextResponse("User not found", { status: 404 });

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { student: true }
        });

        if (!invoice) return new NextResponse("Invoice not found", { status: 404 });

        let isAuthorized = false;
        if (['OWNER', 'PRINCIPAL', 'SUPERADMIN', 'TEACHER'].includes(dbUser.role)) {
            if (dbUser.schoolId === invoice.schoolId) isAuthorized = true;
        } else if (dbUser.role === 'PARENT') {
            const linked = dbUser.parentLinks.some(link => link.studentId === invoice.studentId);
            if (linked) isAuthorized = true;
        }

        if (!isAuthorized) return new NextResponse("Forbidden", { status: 403 });

        if (invoice.status === 'PAID') {
            try {
                const { logActivity } = await import('@/lib/audit');
                const _ip = typeof req !== 'undefined' && req instanceof Request ? (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined) : undefined;
                if (authUser?.id) {
                    await logActivity({ userId: authUser.id, action: 'CREATE', resourceType: 'payment', ip: _ip });
                }
            } catch { /* non-blocking */ }
            return NextResponse.json({ message: "Already Paid" });
        }

        // Check if there's already a pending payment for this invoice
        const existingPending = await prisma.payment.findFirst({
            where: {
                invoiceId: invoice.id,
                status: 'PENDING'
            }
        });

        if (existingPending) {
            return NextResponse.json({ error: "Verification in progress for a previous submission." }, { status: 400 });
        }

        // Determine if this is a manual settlement that needs verification
        const needsVerification = ["BANK_TRANSFER", "CASH", "OTHER", "MOBILE_MONEY"].includes(method);
        let finalStatus = needsVerification ? "PENDING" : "SUCCESS";
        let aiReference = reference || null;

        // Verify with AI if receipt image is provided
        if (receiptImage && needsVerification && process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const base64Data = receiptImage.includes(',') ? receiptImage.split(',')[1] : receiptImage;
                // Infer mime type from data URI or default to jpeg
                let mimeType = "image/jpeg";
                if (receiptImage.startsWith('data:image/png')) mimeType = "image/png";
                if (receiptImage.startsWith('data:image/webp')) mimeType = "image/webp";

                const prompt = `You are a financial verification AI. 
Analyze the provided receipt image.
The expected amount to be paid is ${invoice.amount}.
Does this image appear to be a legitimate payment receipt? Does the amount paid match or exceed the expected amount?
Respond strictly in JSON format:
{
    "isValid": boolean,
    "amount": number,
    "reason": "short explanation"
}`;

                const aiResult = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    }
                ]);

                const responseText = aiResult.response.text();
                const parsed = extractAndParseJson<{ isValid: boolean; amount: number; reason: string } | null>(responseText, null);
                
                if (parsed) {
                    if (parsed.isValid && Number(parsed.amount) >= Number(invoice.amount)) {
                        finalStatus = "SUCCESS";
                        aiReference = reference ? `${reference} | AI: Verified (${parsed.amount})` : `AI Verified: ${parsed.reason}`;
                    } else {
                        aiReference = reference ? `${reference} | AI: Rejected - ${parsed.reason}` : `AI Rejected: ${parsed.reason}`;
                    }
                }
            } catch (e) {
                console.error("AI Verification failed:", e);
                // On failure, it gracefully defaults back to PENDING
            }
        }

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: invoice.amount,
                    method: method,
                    reference: aiReference,
                    status: finalStatus as any
                }
            });

            // Only mark invoice as PAID if status is SUCCESS
            if (finalStatus === 'SUCCESS') {
                await tx.invoice.update({
                    where: { id: invoice.id },
                    data: { status: 'PAID' }
                });
            }

            return payment;
        });

        revalidatePath('/dashboard/finance', 'page');
        revalidatePath('/dashboard/parent', 'page');
        revalidateTag('family-children-data', 'max');

        return NextResponse.json({ success: true, payment: result, pending: needsVerification });

    } catch (e) {
        return handleApiError(e);
    }
}
