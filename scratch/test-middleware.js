const { createServerClient } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
    // 1. Log in to get fresh tokens
    console.log("Logging in to Supabase...");
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client.auth.signInWithPassword({
        email: "teacher@lucy.edu",
        password: "Lucy@Teacher2026!"
    });
    
    if (error) {
        console.error("Login failed:", error.message);
        return;
    }
    
    const { access_token, refresh_token } = data.session;
    console.log("Logged in. UID:", data.user.id);
    
    // 2. Set up cookie values
    // Next.js SSR Auth helper uses standard chunked cookies, or a single cookie if it fits.
    // The format is a JSON string of the session.
    const sessionCookieValue = JSON.stringify(data.session);
    const cookieName = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
    
    console.log(`Setting up simulated cookies with name: ${cookieName}`);
    
    // Create cookie store
    const cookieMap = new Map();
    cookieMap.set(cookieName, sessionCookieValue);
    
    // Now create Server Client
    const supabaseSSR = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        cookieMap.set(name, value);
                    });
                }
            }
        }
    );
    
    console.log("Calling supabase.auth.getUser() via SSR client...");
    const { data: { user }, error: authError } = await supabaseSSR.auth.getUser();
    
    if (authError) {
        console.error("SSR getUser failed:", authError.message);
    } else {
        console.log("SSR getUser success! UID:", user.id);
    }
}

run();
