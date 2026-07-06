require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log("Reading rls_policies.sql...");
    const sql = fs.readFileSync(path.join(__dirname, '../prisma/rls_policies.sql'), 'utf8');
    
    // Split by semicolon, but be careful with function definitions that contain semicolons
    // The easiest way is to use pg library directly since Prisma doesn't support multiple commands
    
    const { Client } = require('pg');
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log("Applying RLS policies to the database...");
    await client.query(sql);
    console.log("Successfully applied all strict RLS policies!");
    await client.end();
}

main()
  .catch(e => {
      console.error(e);
      process.exit(1);
  })
  .finally(async () => {
      await prisma.$disconnect();
  });
