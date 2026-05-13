import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const reqHeaders = await headers();
        const authHeader = reqHeaders.get('authorization');
        
        let tokenData = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            const res = await supabaseAuth.auth.getUser(token);
            tokenData = res.data?.user;
        }

        let dbUser = null;
        let dbError = null;
        if (tokenData) {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const { data, error } = await supabaseAdmin
                .from('User')
                .select('id, role, schoolId, name')
                .eq('id', tokenData.id)
                .single();
            dbUser = data;
            dbError = error;
        }

        return NextResponse.json({ 
            authHeader: authHeader ? "Present" : "Missing",
            tokenData: tokenData?.id,
            dbUser,
            dbError: dbError?.message,
            time: new Date().toISOString()
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
