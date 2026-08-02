const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in environment");
        process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const pool = new Pool({ 
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    const email = 'superadmin@lucy-app.com';
    const password = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!'; // Secure password
    
    console.log(`Creating superadmin with email: ${email}`);
    
    // 1. Create in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });
    
    if (authError) {
        if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
            console.log("User already exists in Supabase. Proceeding to update PG.");
        } else {
            console.error("Supabase error:", authError);
            process.exit(1);
        }
    }
    
    let userId = authData?.user?.id;
    if (!userId) {
        const { data } = await supabase.auth.admin.listUsers();
        userId = data.users.find(u => u.email === email)?.id;
    }
    
    if (!userId) {
        console.error("Could not find or create Supabase user.");
        process.exit(1);
    }
    
    console.log(`Supabase User ID: ${userId}`);
    
    // 2. Create/Update in Prisma using pg directly
    try {
        const query = `
            INSERT INTO "User" (id, email, name, role, verified, "updatedAt")
            VALUES ($1, $2, 'System Superadmin', 'SUPERADMIN', true, NOW())
            ON CONFLICT (id) DO UPDATE SET 
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                verified = EXCLUDED.verified,
                "updatedAt" = NOW()
        `;
        
        await pool.query(query, [userId, email]);
        
        console.log("-----------------------------------------");
        console.log("SUPERADMIN CREATED SUCCESSFULLY");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log("-----------------------------------------");
        
    } catch (e) {
        console.error("PG error:", e);
    } finally {
        await pool.end();
    }
}

main();
