import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanupStuckUsers() {
    console.log("Fetching all Auth users...");
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    
    if (authError) {
        console.error("Error fetching auth users:", authError);
        return;
    }

    console.log(`Found ${authUsers.users.length} auth users. Checking for missing DB User records...`);

    let deletedCount = 0;
    for (const authUser of authUsers.users) {
        const { data: dbUser } = await supabaseAdmin.from('User').select('id').eq('id', authUser.id).maybeSingle();
        
        if (!dbUser) {
            console.log(`Found stuck Auth user: ${authUser.email} (ID: ${authUser.id}). Deleting...`);
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} stuck auth users.`);
}

cleanupStuckUsers().catch(console.error);
