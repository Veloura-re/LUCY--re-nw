import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const res = await prisma.$queryRaw`
        SELECT tablename, policyname, roles, cmd, qual::text, with_check::text
        FROM pg_policies 
        WHERE schemaname = 'public' 
        ORDER BY tablename, policyname
    `;
    console.table(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());
