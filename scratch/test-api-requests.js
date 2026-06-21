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
        console.log('Access token acquired. Calling report-card API...');

        // Call report card API
        const studentId = '03ae601b-a3a0-4ec1-a516-6a6bcebb2b0b';
        const resReport = await fetch(`http://localhost:3001/api/school/students/${studentId}/report-card`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('report-card Status:', resReport.status);
        const reportJson = await resReport.json();
        console.log('report-card JSON:', JSON.stringify(reportJson, null, 2));

        // Call gradebook API
        const examId = '95080bf9-10ba-4fd3-8e1f-98da2bf18ba9';
        const resGrades = await fetch(`http://localhost:3001/api/teacher/grades?examId=${examId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('grades Status:', resGrades.status);
        const gradesJson = await resGrades.json();
        console.log('grades JSON:', JSON.stringify(gradesJson, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
