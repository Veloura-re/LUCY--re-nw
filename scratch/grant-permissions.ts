import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Permission Sync / Grant Script ---');
    try {
        // 1. Grant USAGE on public schema to standard Supabase API roles
        console.log('Granting USAGE on schema public...');
        await prisma.$executeRawUnsafe(`
            GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, supabase_admin;
        `);
        console.log('✅ Granted schema usage');

        // 2. Grant SELECT, INSERT, UPDATE, DELETE on all tables in public schema
        console.log('Granting permissions on all tables...');
        await prisma.$executeRawUnsafe(`
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, supabase_admin;
        `);
        console.log('✅ Granted table privileges');

        // 3. Grant privileges on all sequences in public schema
        console.log('Granting permissions on all sequences...');
        await prisma.$executeRawUnsafe(`
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, supabase_admin;
        `);
        console.log('✅ Granted sequence privileges');

        // 4. Set default privileges for future tables
        console.log('Setting default privileges for future tables...');
        await prisma.$executeRawUnsafe(`
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, supabase_admin;
        `);
        console.log('✅ Default privileges updated');

        console.log('🎉 Permissions repaired successfully!');
    } catch (e: any) {
        console.error('❌ Error applying grants:', e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
