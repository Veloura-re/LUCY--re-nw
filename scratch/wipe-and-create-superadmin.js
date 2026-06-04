const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const prisma = new PrismaClient();

async function main() {
    console.log("=========================================");
    console.log("   WIPING DATABASE & CREATING SUPERADMIN  ");
    console.log("=========================================");

    try {
        // 1. Delete all Supabase Auth Users
        console.log("\n1. Fetching all Supabase Auth users...");
        let allUsers = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: 100
            });

            if (error) {
                throw new Error(`Failed to list auth users: ${error.message}`);
            }

            if (!users || users.length === 0) {
                hasMore = false;
            } else {
                allUsers = allUsers.concat(users);
                page++;
            }
        }

        console.log(`Found ${allUsers.length} users in Supabase Auth.`);

        for (const user of allUsers) {
            console.log(`Deleting auth user: ${user.email} (${user.id})...`);
            const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
            if (error) {
                console.error(`[WARNING] Failed to delete auth user ${user.email}: ${error.message}`);
            }
        }
        console.log("All Supabase Auth users deleted.");

        // 2. Truncate all public database tables using CASCADE
        console.log("\n2. Wiping all public database tables via TRUNCATE CASCADE...");
        await prisma.$executeRawUnsafe(`
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);
        console.log("All public database tables successfully wiped clean!");

        // 3. Create Default School
        console.log("\n3. Creating default School...");
        const school = await prisma.school.create({
            data: {
                id: 'f1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
                name: 'LUCY Academy of Excellence',
                schoolCode: 'LUCY-RE-01',
                status: 'ACTIVE'
            }
        });
        console.log(`School created: ${school.name} (Code: ${school.schoolCode})`);

        // 4. Create single Superadmin in Supabase Auth
        const superadminEmail = 'sysadmin_core@lucy-re.edu';
        const superadminPassword = 'C0mplex_P@ssw0rd_9921!#';
        console.log(`\n4. Creating Superadmin in Supabase Auth: ${superadminEmail}...`);
        
        const { data: { user: authUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: superadminEmail,
            password: superadminPassword,
            email_confirm: true
        });

        if (createError) {
            throw new Error(`Failed to create superadmin in auth: ${createError.message}`);
        }

        console.log(`Superadmin auth user created successfully. ID: ${authUser.id}`);

        // 5. Create corresponding User record in Prisma User table
        console.log(`\n5. Creating user record in db with role SUPERADMIN...`);
        const dbUser = await prisma.user.create({
            data: {
                id: authUser.id,
                email: superadminEmail,
                name: 'Super Administrator',
                role: 'SUPERADMIN',
                verified: true,
                schoolId: school.id
            }
        });

        console.log(`\n=========================================`);
        console.log(`   SUCCESS! DB RESET AND SUPERADMIN READY`);
        console.log(`=========================================`);
        console.log(`Email:    ${dbUser.email}`);
        console.log(`Password: ${superadminPassword}`);
        console.log(`Role:     ${dbUser.role}`);
        console.log(`User ID:  ${dbUser.id}`);
        console.log(`=========================================`);

    } catch (err) {
        console.error("\n[FATAL ERROR] Operation failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
