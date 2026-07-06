const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

try {
    const envContent = fs.readFileSync('.dev.vars', 'utf-8');
    envContent.split('\n').forEach(line => {
        if (line.includes('=')) {
            const [key, ...rest] = line.split('=');
            process.env[key.trim()] = rest.join('=').trim().replace('\r', '');
        }
    });
} catch (e) {
    console.log("Could not load .dev.vars, assuming environment variables are set.");
}

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
