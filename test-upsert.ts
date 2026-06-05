import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  const { data, error } = await supabaseAdmin.from('User').upsert({
    id: 'test-uuid-1234',
    email: 'test@example.com',
    name: 'Test Name',
    role: 'PRINCIPAL',
    verified: true,
    schoolId: null,
    updatedAt: new Date().toISOString()
  });

  console.log("Upsert result:", { data, error });
}

testUpsert();
