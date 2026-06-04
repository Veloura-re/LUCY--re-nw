const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
const prisma = new PrismaClient();

async function main() {
    const email = 'goodluck97248@gmail.com';
    const authId = '4cd6b293-dd1c-4700-840f-66ccfffd17ba';
    const fullName = 'abud';

    console.log(`\nFixing DB record for ${email}...`);

    // Check if there is an existing invite token (burned or not) to get schoolId
    const invite = await prisma.inviteToken.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' }
    });

    const schoolId = invite?.schoolId ?? null;
    console.log(`Found invite token: ${invite ? invite.token : 'NONE'} | schoolId: ${schoolId}`);

    // Upsert the DB user record with the real Supabase auth ID
    const user = await prisma.user.upsert({
        where: { id: authId },
        update: {
            email,
            name: fullName,
            role: 'PRINCIPAL',
            verified: true,
            schoolId
        },
        create: {
            id: authId,
            email,
            name: fullName,
            role: 'PRINCIPAL',
            verified: true,
            schoolId
        }
    });

    console.log(`\n✅ DB user synced successfully!`);
    console.log(`  ID:      ${user.id}`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  Role:    ${user.role}`);
    console.log(`  School:  ${user.schoolId ?? 'none'}`);
    console.log(`\nThey can now login with email: ${email} and their password.`);

    await prisma.$disconnect();
}

main().catch(console.error);
