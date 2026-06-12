const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  try {
    console.log("Creating bucket...");
    await prisma.$executeRawUnsafe(`INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true) ON CONFLICT (id) DO UPDATE SET public = true;`);
    
    console.log("Creating policies...");
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow public read" ON storage.objects;`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'school-assets');`);
    
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'school-assets');`);
    
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'school-assets');`);

    console.log("Success!");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
