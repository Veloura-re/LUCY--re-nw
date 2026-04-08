const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const prisma = new PrismaClient();

async function createSuperAdmin() {
    const email = 'commander@lucy.edu';
    const password = 'LUCY_Admin_Password!@#2026_Secure';
    const name = 'LUCY Commander';

    console.log(`Creating SuperAdmin: ${email}`);

    // 1. Create/Get User in Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    let user = users?.find(u => u.email === email);

    if (!user) {
        console.log('Creating user in Supabase Auth...');
        const { data: { user: newUser }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'SUPERADMIN', name }
        });

        if (createError) {
            console.error('Error creating auth user:', createError.message);
            return;
        }
        user = newUser;
        console.log('Auth user created successfully.');
    } else {
        console.log('User already exists in Supabase Auth. Updating password and metadata...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password,
            user_metadata: { role: 'SUPERADMIN', name }
        });
        if (updateError) {
            console.error('Error updating auth user:', updateError.message);
            return;
        }
    }

    // 2. Ensure School exists (using the one from create-admin.sql)
    console.log('Ensuring school exists...');
    const school = await prisma.school.upsert({
        where: { schoolCode: 'LUCY-RE-01' },
        update: {},
        create: {
            id: 'f1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
            name: 'LUCY Academy of Excellence',
            schoolCode: 'LUCY-RE-01',
            status: 'ACTIVE'
        }
    });

    // 3. Create/Update User in Public Schema
    console.log('Syncing user to public schema...');
    await prisma.user.upsert({
        where: { email },
        update: {
            id: user.id, // Ensure IDs match
            role: 'SUPERADMIN',
            name,
            schoolId: school.id,
            verified: true
        },
        create: {
            id: user.id,
            email,
            name,
            role: 'SUPERADMIN',
            schoolId: school.id,
            verified: true,
            updatedAt: new Date()
        }
    });

    console.log('SuperAdmin created/synchronized successfully in public.User table.');
}

createSuperAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
