const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schools = await prisma.school.findMany();
    console.log(schools.map(s => ({ id: s.id, name: s.name, config: s.communicationsConfig })));
}
main().finally(() => prisma.$disconnect());
