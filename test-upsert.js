require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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
    email: 'test1@example.com',
    name: 'Test Name',
    role: 'PRINCIPAL',
    verified: true,
    schoolId: null,
    updatedAt: new Date().toISOString()
  });

  console.log("Upsert result test 1:", { data, error });

  const { data: d2, error: e2 } = await supabaseAdmin.from('User').upsert({
    id: 'test-uuid-1234',
    email: 'test1@example.com',
    name: 'Test Name 2',
    role: 'PRINCIPAL',
    verified: true,
    schoolId: null,
    updatedAt: new Date().toISOString()
  });

  console.log("Upsert result test 2 (conflict):", { data: d2, error: e2 });
}

testUpsert();
