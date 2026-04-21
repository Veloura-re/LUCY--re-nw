const { PrismaClient } = require('@prisma/client');
const { sendInviteEmail } = require('../lib/email');

const prisma = new PrismaClient();
const SCHOOL_ID = 'f1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6';

async function verifySkip() {
    console.log('--- Verification: Email Skipping Logic ---');

    // 1. Verify Default (Enabled)
    console.log('\n[Test 1] Default (Enabled):');
    const res1 = await sendInviteEmail('test@example.com', 'http://link', 'LUCY Academy', 'tok123', 'TEACHER', SCHOOL_ID);
    console.log('Result 1 (Should not be skipped):', res1.skipped ? 'SKIPPED' : 'NOT SKIPPED');

    // 2. Disable Invitations
    console.log('\nDisabling Invitation Protocols...');
    await prisma.school.update({
        where: { id: SCHOOL_ID },
        data: {
            communicationsConfig: {
                sendInvites: false,
                sendReports: true,
                sendInvoices: true,
                replyTo: 'office@lucy.edu'
            }
        }
    });

    // 3. Verify Skip
    console.log('\n[Test 2] Disabled:');
    const res2 = await sendInviteEmail('test@example.com', 'http://link', 'LUCY Academy', 'tok123', 'TEACHER', SCHOOL_ID);
    console.log('Result 2 (Should be skipped):', res2.skipped ? 'SKIPPED' : 'NOT SKIPPED');

    // 4. Reset
    console.log('\nResetting config...');
    await prisma.school.update({
        where: { id: SCHOOL_ID },
        data: {
            communicationsConfig: {
                sendInvites: true,
                sendReports: true,
                sendInvoices: true,
                replyTo: ''
            }
        }
    });

    console.log('\n--- Verification Complete ---');
}

verifySkip()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
