const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
        }
    });
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    try {
        console.log('Logging in to Supabase...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'veloura2133@gmail.com',
            password: '1234567890'
        });

        if (error) {
            console.error('Login error:', error.message);
            return;
        }

        const token = data.session.access_token;
        console.log('User logged in. Testing POST /api/school/students...');

        // Test 1: Enroll with minimal data (no grade specified, no class specified)
        const payload1 = {
            firstName: "TestStudent",
            lastName: "Automated",
            grade: "",
            classId: "",
            gender: "",
            dob: "",
            age: "12",
            address: "123 Education Lane",
            guardianName: "Jane Doe",
            guardianPhone: "+123456789",
            secondaryPhone: "",
            photoUrl: ""
        };

        const res1 = await fetch('http://localhost:3000/api/school/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload1)
        });

        console.log('Test 1 Status:', res1.status);
        const json1 = await res1.json();
        console.log('Test 1 Response:', JSON.stringify(json1, null, 2));

    } catch (e) {
        console.error('Execution failed:', e);
    }
}

main();
