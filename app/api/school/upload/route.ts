import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireRole, ALL_ROLES, publicErrorMessage, handleApiError } from '@/lib/security';
import { reportServerError } from '@/lib/error-capture';
import { rateLimitShared } from '@/lib/rate-limit';
import { logActivity } from '@/lib/audit';
import { validateUpload, GENERAL_RULES, IMAGE_RULES, resolveUploadFolder } from '@/lib/upload-validation';

export async function POST(request: Request) {
    try {
        const limited = await rateLimitShared(request, 'school/upload', 30);
        if (limited) return limited;

        const dbUser = await requireRole(ALL_ROLES);

        const supabase = await createClient();
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = resolveUploadFolder(formData.get('bucket'));

        // Avatars and logos are images only; other folders also accept documents.
        const validation = await validateUpload(file, folder === 'avatars' || folder === 'logos' ? IMAGE_RULES : GENERAL_RULES);
        if (!validation.ok) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const targetBucket = 'school-assets';
        const fileName = `${Date.now()}-${crypto.randomUUID().substring(0, 8)}.${validation.extension}`;
        // Tenant-scoped path inside the school-assets bucket
        const filePath = `${dbUser.schoolId ?? `unscoped/${dbUser.id}`}/${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(targetBucket)
            .upload(filePath, file as File, {
                cacheControl: '3600',
                upsert: false,
                contentType: validation.mimeType
            });

        if (error) {
            console.error('Storage Upload Error:', error);
            void reportServerError(error, { status: 500 });
            return NextResponse.json({ error: publicErrorMessage(error) }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from(targetBucket)
            .getPublicUrl(filePath);

        await logActivity({
            userId: dbUser.id,
            schoolId: dbUser.schoolId || undefined,
            action: 'UPLOAD',
            resourceType: 'file',
            resourceId: filePath,
            ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        });
        return NextResponse.json({ url: publicUrl });

    } catch (e) {
        return handleApiError(e);
    }
}
