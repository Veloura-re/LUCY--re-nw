const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching SUPERADMINs...");
    const superadmins = await prisma.user.findMany({ where: { role: 'SUPERADMIN' } });
    
    console.log(`Found ${superadmins.length} SUPERADMINs. Temporarily backing them up...`);
    
    // Clean up relations on superadmins to ensure they only contain scalar fields
    const superadminScalars = superadmins.map(admin => {
        const clean = { ...admin };
        // Just to be safe, Prisma createMany only accepts scalars, which findMany returns by default.
        return clean;
    });

    console.log("Truncating School table and cascading all dependent data...");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "School" CASCADE;`);
    
    console.log("Restoring SUPERADMINs...");
    if (superadminScalars.length > 0) {
        await prisma.user.createMany({ data: superadminScalars });
        console.log(`Successfully restored ${superadminScalars.length} SUPERADMINs.`);
    }

    console.log("Successfully removed all schools and associated data!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
