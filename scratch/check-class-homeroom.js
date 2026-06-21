const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const cls = await prisma.class.findUnique({
            where: { id: 'bd51c694-3f73-42ed-b73b-b1ba67e07cb8' }
        });
        console.log('Class:', cls);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
