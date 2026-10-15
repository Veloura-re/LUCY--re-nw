import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireSchoolLinked, handleApiError } from '@/lib/security';
import { rateLimitShared } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';
import { validateUpload, GENERAL_RULES } from '@/lib/upload-validation';

export async function POST(request: Request) {
    try {
        const limited = await rateLimitShared(request, 'student/assignments/upload', 20);
        if (limited) return limited;

        const dbUser = await requireSchoolLinked();
        if (dbUser.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Only students can upload assignment files' }, { status: 403 });
        }

        const supabase = await createClient();

        const formData = await request.formData();
        const file = formData.get('file');

        const validation = await validateUpload(file, GENERAL_RULES);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const fileName = `${Date.now()}-${crypto.randomUUID().substring(0, 8)}.${validation.extension}`;
        const filePath = `${dbUser.schoolId!}/student-submissions/${dbUser.id}/${fileName}`;

        // We will reuse the 'books' bucket for assignments to reduce bucket configuration overhead
        // but store them in a specific folder.
        const { data, error } = await supabase.storage
            .from('books')
            .upload(filePath, file as File, {
                cacheControl: '3600',
                upsert: false,
                contentType: validation.mimeType
            });

        if (error) {
            console.error('Storage error:', error);
            if ((error as any).status === 404 || (error as any).message?.toLowerCase().includes('not found')) {
                return NextResponse.json({
                    error: `Storage Infrastructure Missing: The "books" bucket does not exist. Please create a PUBLIC bucket named "books" in your Supabase project dashboard.`
                }, { status: 404 });
            }
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('books')
            .getPublicUrl(filePath);

        await logActivity({
            userId: dbUser.id,
            schoolId: dbUser.schoolId || undefined,
            action: 'UPLOAD',
            resourceType: 'assignment',
            resourceId: filePath,
            ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        });
        return NextResponse.json({
            url: publicUrl,
            name: (file as File).name,
            size: (file as File).size
        });
    } catch (e) {
        return handleApiError(e);
    }
}
