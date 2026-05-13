const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://caeeusbhwrkelnffbbub.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZWV1c2Jod3JrZWxuZmZiYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTA1MjMsImV4cCI6MjA4NjIyNjUyM30.eKeVzCPiBHiFSh-QU4cT9FwRK7MDO7HQQzxLHminvRE";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin(email, password) {
    console.log(`Testing login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(`[ERROR] Login failed: ${error.message}`);
        return null;
    }

    console.log(`[SUCCESS] Logged in successfully. User ID: ${data.user.id}`);
    
    // Now test fetching user data to simulate what the Edge dashboard would do
    console.log(`Testing user profile fetch via REST (Edge simulation)...`);
    const { data: profile, error: profileError } = await supabase
        .from('User')
        .select('id, email, role, schoolId')
        .eq('id', data.user.id)
        .single();
        
    if (profileError) {
        console.error(`[ERROR] Profile fetch failed: ${profileError.message}`);
    } else {
        console.log(`[SUCCESS] Profile fetched:`, profile);
    }
}

async function runTests() {
    console.log("--- STARTING END-TO-END DATA VERIFICATION ---");
    await testLogin("teacher@lucy.edu", "Password123!");
    console.log("---------------------------------------------");
    await testLogin("student@lucy.edu", "Password123!");
}

runTests();
