const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lucy-re-nw.vercel.app', // wait we don't have the URL easily unless we read .env
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake'
  );
  console.log("We need to fetch the env vars first.");
}
run();
