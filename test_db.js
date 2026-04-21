const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({ take: 10, select: { studentCode: true, firstName: true } });
  console.log(students);
}
main().catch(console.error).finally(() => prisma.$disconnect());
