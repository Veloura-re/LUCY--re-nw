const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'goodluck97248@gmail.com';
    
    console.log(`\n=== Checking user: ${email} ===\n`);

    // 1. List all Supabase Auth users to find this one
    console.log("-- Supabase Auth Users --");
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error("Error listing auth users:", error.message);
    } else {
        for (const u of users) {
            console.log(`  Auth: ${u.email} | ID: ${u.id} | role meta: ${JSON.stringify(u.user_metadata?.role)}`);
        }
        
        const found = users.find(u => u.email === email);
        if (found) {
            console.log(`\n>>> Found in Auth: ID=${found.id}`);
            console.log(`>>> user_metadata: ${JSON.stringify(found.user_metadata, null, 2)}`);
        } else {
            console.log(`\n>>> NOT found in Supabase Auth!`);
        }
    }
    
    // 2. Check Prisma DB
    console.log("\n-- Prisma DB Users --");
    const allDbUsers = await prisma.user.findMany({ select: { id: true, email: true, role: true, schoolId: true } });
    for (const u of allDbUsers) {
        console.log(`  DB: ${u.email} | ID: ${u.id} | role: ${u.role} | schoolId: ${u.schoolId}`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
