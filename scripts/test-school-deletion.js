const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDeleteSchool() {
    console.log('Testing School Deletion...');
    try {
        // Find a school created by test script
        const school = await prisma.school.findFirst({
            where: { schoolCode: { startsWith: 'DBG-' } }
        });

        if (!school) {
            console.log('No debug school found to delete.');
            return;
        }

        console.log(`Deleting school: ${school.name} (${school.id})...`);

        // Note: The actual API does a lot of dependent deletions.
        // For this test, we just want to see if the RLS allows the 'delete' command on School.
        await prisma.school.delete({
            where: { id: school.id }
        });

        console.log('Success! School deleted.');
    } catch (e) {
        console.error('Failed to delete school:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testDeleteSchool();
