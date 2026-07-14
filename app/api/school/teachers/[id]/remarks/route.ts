import { NextResponse } from "next/server";
import { getCachedUser } from "@/lib/users";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const author = await getCachedUser(user.id);
        if (!author || !['OWNER', 'PRINCIPAL', 'SUPERADMIN'].includes(author.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body: any = await req.json();
        const { type, content, rating } = body;

        if (!content || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const remark = await prisma.teacherRemark.create({
            data: {
                teacherId: id,
                authorId: user.id,
                type,
                content,
                rating: type === 'REVIEW' ? rating : null,
            }
        });

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request instanceof Request ? (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || undefined) : undefined;
            const _userId = (typeof user !== 'undefined' && user?.id) ? user.id : undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'CREATE', resourceType: 'teacher_remark', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({ success: true, remark });
    } catch (error) {
        console.error("Error creating teacher remark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
