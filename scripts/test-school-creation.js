const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreateSchool() {
    console.log('Testing School Creation...');
    try {
        const school = await prisma.school.create({
            data: {
                name: 'Debug School ' + Date.now(),
                schoolCode: 'DBG-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
                status: 'PENDING'
            }
        });
        console.log('Success!', school.id);
    } catch (e) {
        console.error('Failed to create school:', e.message);
        if (e.code === 'P2002') console.log('Unique constraint failed.');
        if (e.message.includes('permission denied')) console.log('RLS is likely blocking this.');
    } finally {
        await prisma.$disconnect();
    }
}

testCreateSchool();
