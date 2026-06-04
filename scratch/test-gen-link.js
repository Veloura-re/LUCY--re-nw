const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
    try {
        console.log("Generating link...");
        const res = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: 'goodluck97248@gmail.com',
            options: {
                redirectTo: `https://5-cn.net/auth/callback?next=/dashboard/settings`,
            }
        });
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Exception caught:", e);
    }
}

test();
