const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const envContent = fs.readFileSync('.env.vercel', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [key, ...rest] = line.split('=');
        env[key.trim()] = rest.join('=').trim().replace('\r', '').replace(/"/g, '');
    }
});

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env['DATABASE_URL']
        }
    }
});

async function main() {
    try {
        const superadmins = await prisma.user.findMany({
            where: { role: 'SUPERADMIN' }
        });
        console.log("SUPERADMINS:", superadmins.map(u => ({ id: u.id, email: u.email, name: u.name })));
        
        // Let's also fetch the last 5 users
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log("LAST 5 USERS:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
