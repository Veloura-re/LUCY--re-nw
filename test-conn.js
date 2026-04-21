const { PrismaClient } = require('@prisma/client');

const projectRef = 'caeeusbhwrkelnffbbub';
const pw = 'amsocookd2133';

const hosts = [
    'aws-1-eu-west-1.pooler.supabase.com',
    `db.${projectRef}.supabase.co`,
    `caeeusbhwrkelnffbbub.pooler.supabase.com`
];

const users = [
    'postgres',
    `postgres.${projectRef}`
];

const ports = [5432, 6543];

async function main() {
    for (const host of hosts) {
        for (const user of users) {
            for (const port of ports) {
                const url = `postgresql://${user}:${pw}@${host}:${port}/postgres${port === 6543 ? '?pgbouncer=true' : ''}`;
                console.log(`Testing: ${host}:${port} | user: ${user}`);
                const prisma = new PrismaClient({ datasources: { db: { url } } });
                try {
                    await prisma.$connect();
                    console.log(`>>> SUCCESS! URL: ${url}`);
                    process.exit(0);
                } catch (e) {
                    const msg = e.message.split('invocation:')[0].replace(/\n/g, ' ').trim();
                    console.log(`    Failed: ${msg.substring(0, 100)}...`);
                } finally {
                    await prisma.$disconnect();
                }
            }
        }
    }
    console.log("All exhaustive combinations failed.");
}
main();
