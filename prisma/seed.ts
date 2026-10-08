import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // SuperAdmin is managed independently and not created via demo seeding.
    const existingSuperAdmin = await prisma.user.findFirst({
        where: { role: 'SUPERADMIN' }
    });
    console.log({ existingSuperAdmin: existingSuperAdmin?.email || 'None' });
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
