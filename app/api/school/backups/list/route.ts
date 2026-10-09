import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage } from '@/lib/security';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function GET(request: Request) {
    try {
        const user = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!user.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });

        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: restorePoints, error } = await supabaseAdmin
            .from('RestorePoint')
            .select('*')
            .eq('schoolId', user.schoolId)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ restorePoints: restorePoints || [] });
    } catch (error: any) {
        console.error("Fetch Backups Error:", error);
        return NextResponse.json({ error: publicErrorMessage(error, 'Failed to fetch backups') }, { status: 500 });
    }
}
