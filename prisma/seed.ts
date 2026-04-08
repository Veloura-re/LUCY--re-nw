import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // Create Super Admnin
    // Note: This user must also exist in Supabase Auth with this email/password
    // The ID here should ideally match Supabase Auth ID if we are strict, 
    // or we rely on email matching logic in our app (which is risky but common for MVP seeding).
    // For now, let's just create the Prisma record.

    const superAdminId = '945d922d-f9e2-4a15-ba5c-807127b83272';
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@lucy.edu' },
        update: {
            id: superAdminId,
            role: 'SUPERADMIN'
        },
        create: {
            id: superAdminId,
            email: 'admin@lucy.edu',
            name: 'Super Admin',
            role: 'SUPERADMIN',
            verified: true,
        },
    });

    console.log({ superAdmin })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
