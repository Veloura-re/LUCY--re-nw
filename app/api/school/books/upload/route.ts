import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { requireRole, handleApiError } from '@/lib/security';
import { logActivity } from '@/lib/audit';
import { validateUpload, IMAGE_RULES, BOOK_FILE_RULES } from '@/lib/upload-validation';
import { fileRef } from '@/lib/storage-files';

export async function POST(request: Request) {
    try {
        const dbUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        const supabase = await createClient();

        const formData = await request.formData();
        const file = formData.get('file');
        const type = formData.get('type');

        const validation = await validateUpload(file, type === 'cover' ? IMAGE_RULES : BOOK_FILE_RULES);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        
        // Use a covers directory if type is cover
        const directory = type === 'cover' ? 'covers' : 'pdfs';
        const fileName = `${Date.now()}-${crypto.randomUUID().substring(0, 8)}.${validation.extension}`;
        const filePath = `${dbUser.schoolId!}/${directory}/${fileName}`;

        // Upload to Supabase Storage - 'books' bucket
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
                    error: `Storage Infrastructure Missing: The "books" bucket does not exist. Please create a private bucket named "books" in your Supabase project dashboard.`
                }, { status: 404 });
            }
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        await logActivity({
            userId: dbUser.id,
            schoolId: dbUser.schoolId || undefined,
            action: 'UPLOAD',
            resourceType: 'book',
            resourceId: filePath,
            ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        });
        return NextResponse.json({
            url: fileRef('books', filePath),
            name: (file as File).name,
            size: (file as File).size
        });
    } catch (e) {
        return handleApiError(e);
    }
}
