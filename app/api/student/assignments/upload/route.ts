import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireSchoolLinked, handleApiError } from '@/lib/security';

export async function POST(request: Request) {
    try {
        const dbUser = await requireSchoolLinked();
        if (dbUser.role !== 'STUDENT') {
            return NextResponse.json({ error: 'Only students can upload assignment files' }, { status: 403 });
        }

        const supabase = await createClient();

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${globalThis.crypto.randomUUID().substring(0, 8)}.${fileExtension}`;
        const filePath = `${dbUser.schoolId!}/student-submissions/${dbUser.id}/${fileName}`;

        // We will reuse the 'books' bucket for assignments to reduce bucket configuration overhead
        // but store them in a specific folder.
        const { data, error } = await supabase.storage
            .from('books')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage error:', error);
            if ((error as any).status === 404 || (error as any).message?.toLowerCase().includes('not found')) {
                return NextResponse.json({
                    error: `Storage Infrastructure Missing: The "books" bucket does not exist. Please create a PUBLIC bucket named "books" in your Supabase project dashboard.`
                }, { status: 404 });
            }
            return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('books')
            .getPublicUrl(filePath);

        
        // Audit log
        try {
            const { logActivity } = await import('@/lib/audit');
            const _ip = request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || request?.headers?.get('cf-connecting-ip') || undefined;
            const _userId = dbUser?.id ?? undefined;
            if (_userId) {
                await logActivity({ userId: _userId, action: 'UPLOAD', resourceType: 'assignment', ip: _ip || undefined });
            }
        } catch { /* non-blocking */ }
return NextResponse.json({
            url: publicUrl,
            name: file.name,
            size: file.size
        });
    } catch (e) {
        return handleApiError(e);
    }
}
