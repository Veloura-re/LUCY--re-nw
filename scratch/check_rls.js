const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    const { data, error } = await supabase.rpc('get_policies', {}).catch(async () => {
        // Fallback to querying pg_policies via REST if RPC doesn't exist
        const { data: qData, error: qErr } = await supabase.from('pg_policies').select('*').limit(50);
        if (qErr) {
            // Direct postgres query using prisma
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();
            const res = await prisma.$queryRaw`SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`;
            await prisma.$disconnect();
            return { data: res, error: null };
        }
        return { data: qData, error: qErr };
    });
    
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Active Policies:");
        console.log(JSON.stringify(data, null, 2));
    }
}

checkPolicies();
