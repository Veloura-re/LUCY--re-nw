const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLookup() {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    console.log(`Testing lookup for non-existent ID: ${nonExistentId}`);
    
    try {
        const { data, error } = await supabaseAdmin
            .from('User')
            .select('*, school:School(*)')
            .eq('id', nonExistentId)
            .maybeSingle();

        if (error) {
            console.error('Error (Expected null if not found):', error.message);
        } else {
            console.log('Result (Should be null):', data);
        }
    } catch (err) {
        console.error('Fatal Error:', err.message);
    }
}

testLookup();
