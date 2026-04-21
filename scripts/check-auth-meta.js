const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuthMetadata() {
    console.log('--- Supabase Auth Metadata Audit ---');
    try {
        const result = await prisma.$queryRaw`
            SELECT id, email, raw_user_meta_data 
            FROM auth.users 
            WHERE email = 'commander@lucy.edu'
        `;
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Failed to query auth.users:', e.message);
        console.log('Note: This requires access to the auth schema, which might be restricted.');
    } finally {
        await prisma.$disconnect();
    }
}

checkAuthMetadata();
