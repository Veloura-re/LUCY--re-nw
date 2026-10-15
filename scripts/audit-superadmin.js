const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } }
});

async function auditSuperadmin() {
    const email = 'commander@lucy.edu';
    console.log('--- Superadmin Audit ---');

    console.log('\n[1] Checking Prisma User table...');
    const dbUser = await prisma.user.findUnique({ where: { email } });
    console.log('DB User:', JSON.stringify(dbUser, null, 2));

    console.log('\n[2] Checking Supabase Auth...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error listing users:', error.message);
    } else {
        const authUser = users.find(u => u.email === email);
        console.log('Auth User:', JSON.stringify(authUser, null, 2));

        if (dbUser && authUser && dbUser.id !== authUser.id) {
            console.log('\nID MISMATCH DETECTED!');
            console.log(`Prisma ID: ${dbUser.id}`);
            console.log(`Auth ID: ${authUser.id}`);
        } else {
            console.log('\nIDs match.');
        }
    }
    console.log('\n------------------------');
    await prisma.$disconnect();
}

auditSuperadmin();
