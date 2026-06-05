const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ take: 5, orderBy: { updatedAt: 'desc' } });
  console.log('Users:', users);
  const tokens = await prisma.inviteToken.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log('Tokens:', tokens);
}
run();
