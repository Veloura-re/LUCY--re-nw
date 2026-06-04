const SUPABASE_URL = "https://caeeusbhwrkelnffbbub.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZWV1c2Jod3JrZWxuZmZiYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTA1MjMsImV4cCI6MjA4NjIyNjUyM30.eKeVzCPiBHiFSh-QU4cT9FwRK7MDO7HQQzxLHminvRE";

async function run() {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: "teacher@lucy.edu", password: "Lucy@Teacher2026!" })
    });
    const token = (await res.json()).access_token;
    console.log("Logged in. Token:", token ? "YES" : "NO");
    
    const edge = await fetch("http://localhost:8787/api/test-edge", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    console.log("Response:", await edge.json());
}
run();
