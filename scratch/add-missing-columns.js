const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected!');

  // Check what columns the School table currently has
  const cols = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'School'
    ORDER BY ordinal_position;
  `);
  console.log('Current School columns:', cols.rows.map(r => r.column_name));

  // Create enum types if they don't exist
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "TermStructure" AS ENUM ('SEMESTERS', 'QUARTERS', 'TRIMESTERS', 'CUSTOM');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('TermStructure enum OK');

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'TERM', 'SEMESTER', 'ANNUALLY', 'ONE_TIME');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('FeeFrequency enum OK');

  // Add missing columns to School table if they don't exist
  const alterStatements = [
    `ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "termStructure" "TermStructure" NOT NULL DEFAULT 'QUARTERS'`,
    `ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "termStructureLocked" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "defaultBillingCycle" "FeeFrequency" NOT NULL DEFAULT 'TERM'`,
  ];

  for (const sql of alterStatements) {
    await client.query(sql);
    console.log('Executed:', sql.slice(0, 80));
  }

  // Verify
  const cols2 = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'School'
    ORDER BY ordinal_position;
  `);
  console.log('\nSchool columns after migration:', cols2.rows.map(r => r.column_name));
  console.log('\n✅ Done! All missing columns added.');
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => client.end());
