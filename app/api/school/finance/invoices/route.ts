import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from '@/lib/security';

export async function GET(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const { searchParams } = new URL(request.url);
        
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const search = searchParams.get('search')?.toLowerCase() || '';
        const status = searchParams.get('status') || 'ALL';
        const offset = (page - 1) * limit;

        const where: any = { schoolId: dbUser.schoolId! };
        if (status !== 'ALL') where.status = status;
        if (search) {
            where.student = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { studentCode: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [total, invoices] = await Promise.all([
            prisma.invoice.count({ where }),
            prisma.invoice.findMany({
                where,
                include: {
                    student: { select: { firstName: true, lastName: true, studentCode: true } },
                    payments: { orderBy: { createdAt: 'desc' }, take: 1 }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            })
        ]);

        return NextResponse.json({
            invoices,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        return handleApiError(e);
    }
}

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const body: any = await request.json().catch(() => ({}));
        const { studentId, amount, name = 'Tuition & Fee', description, dueDate } = body;

        if (!studentId || !amount) {
            return new NextResponse("Student ID and amount are required", { status: 400 });
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId }
        });

        if (!student || student.schoolId !== dbUser.schoolId) {
            return new NextResponse("Student not found in your school", { status: 404 });
        }

        const invoice = await prisma.invoice.create({
            data: {
                studentId,
                schoolId: dbUser.schoolId!,
                amount: Number(amount),
                status: 'PENDING',
                dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: {
                    create: [
                        {
                            name: String(name),
                            amount: Number(amount),
                            description: description || 'Direct student billing'
                        }
                    ]
                }
            },
            include: {
                items: true,
                payments: true
            }
        });

        return NextResponse.json({ success: true, invoice });
    } catch (e) {
        return handleApiError(e);
    }
}
