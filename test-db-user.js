const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        where: { email: { contains: "lucy.edu" } },
        include: { school: true }
    });
    console.log("lucy.edu users:", users);

    const genesisUsers = await prisma.user.findMany({
        where: { email: { contains: "genesis.edu" } },
        include: { school: true }
    });
    console.log("genesis.edu users:", genesisUsers);
}
check().finally(() => prisma.$disconnect());
