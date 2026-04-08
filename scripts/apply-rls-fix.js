const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runFix() {
    console.log('Reading SQL script...');
    const sql = fs.readFileSync(path.join(__dirname, 'fix_rls_policies.sql'), 'utf8');

    console.log('Executing RLS fix script...');
    try {
        // Better splitting: split by semicolon but handle newlines and comments inside
        const statements = sql
            .replace(/\/\*[\s\S]*?\*\/|([^:]|^)--.*$/gm, '$1') // Remove comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            if (statement.toUpperCase() === 'BEGIN' || statement.toUpperCase() === 'COMMIT') continue;
            console.log(`Executing: ${statement.substring(0, 100).replace(/\n/g, ' ')}...`);
            await prisma.$executeRawUnsafe(statement);
        }

        console.log('RLS policies applied successfully.');
    } catch (e) {
        console.error('Failed to apply RLS policies:', e.message);
        if (e.meta) console.error('Meta:', e.meta);
    } finally {
        await prisma.$disconnect();
    }
}

runFix();
