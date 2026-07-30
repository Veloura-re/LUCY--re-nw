import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany({ where: { role: 'SUPERADMIN' }}).then(console.log);
