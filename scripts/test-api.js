const { createClient } = require('@supabase/supabase-js');

async function testApi() {
    console.log('--- Simulating API Request ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('1. Authenticating as Superadmin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'commander@lucy.edu',
        password: 'LUCY_Admin_Password!@#2026_Secure'
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }

    const { session } = authData;
    if (!session) {
        console.error('No session returned.');
        return;
    }

    console.log('User authenticated. ID:', session.user.id);

    const cookieValue = encodeURIComponent(JSON.stringify([
        session.access_token,
        session.refresh_token,
        null,
        null,
        null
    ]));

    const projectId = new URL(supabaseUrl).hostname.split('.')[0];
    const cookieString = `sb-${projectId}-auth-token=${cookieValue}`;

    console.log('\n2. Making GET request to /api/debug-auth using cookies...');

    try {
        const response = await fetch('http://localhost:3000/api/debug-auth', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString,
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);

        try {
            const json = JSON.parse(text);
            console.log('Response JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Response Text:', text);
        }
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}

testApi();
