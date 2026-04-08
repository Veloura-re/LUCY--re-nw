import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireRole, requireAuth } from '@/lib/security';

export async function POST(request: Request) {
    try {
        await requireAuth();

        const supabase = await createClient();
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = (formData.get('bucket') as string) || 'avatars';

        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const isAllowed = allowedTypes.some(type => file.type.startsWith(type));

        if (!isAllowed) {
            return NextResponse.json({ error: 'Unsupported file format. Please upload images, PDFs, or Word documents.' }, { status: 400 });
        }

        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        // Optionally organize by date or just root
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrl });

    } catch (e) {
        console.error("[UPLOAD_API]", e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
