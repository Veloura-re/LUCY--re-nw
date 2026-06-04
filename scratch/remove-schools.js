const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=========================================");
    console.log("   REMOVING ALL SCHOOLS FOR SUPERADMIN   ");
    console.log("=========================================");

    try {
        // 1. Set schoolId to null for all users (e.g. the superadmin)
        console.log("1. Setting schoolId to null for all users...");
        await prisma.user.updateMany({
            data: {
                schoolId: null
            }
        });
        console.log("Done.");

        // 2. Delete all schools
        console.log("2. Deleting all school records...");
        const deleteCount = await prisma.school.deleteMany({});
        console.log(`Successfully deleted ${deleteCount.count} schools.`);

        console.log("\n=========================================");
        console.log("   SUCCESS! SCHOOLS REMOVED");
        console.log("=========================================");
    } catch (e) {
        console.error("Error removing schools:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
