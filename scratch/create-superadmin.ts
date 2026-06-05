import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from Next.js .env
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSuperAdmin() {
    const email = 'masteradmin@lucy.local';
    const password = 'SuperSecurePassword2026!';
    const name = 'Global System Admin';

    console.log(`[1/3] Creating Supabase Auth account for ${email}...`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: 'SUPERADMIN',
            full_name: name
        }
    });

    if (authError) {
        console.error("Failed to create auth user:", authError);
        process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`[2/3] Auth account created with ID: ${userId}`);

    // Hash the password for the DB fallback (if needed)
    const encoder = new TextEncoder();
    const pwData = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', pwData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`[3/3] Inserting into public.User table...`);

    const { error: dbError } = await supabaseAdmin.from('User').insert({
        id: userId,
        email,
        passwordHash: hashedPassword,
        name,
        role: 'SUPERADMIN',
        schoolId: null,
        verified: true,
        updatedAt: new Date().toISOString()
    });

    if (dbError) {
        console.error("Failed to create User record:", dbError);
        // Attempt rollback
        await supabaseAdmin.auth.admin.deleteUser(userId);
        process.exit(1);
    }

    console.log("==========================================");
    console.log("✅ SUPERADMIN SUCCESSFULLY CREATED!");
    console.log("Email:    " + email);
    console.log("Password: " + password);
    console.log("Role:     SUPERADMIN");
    console.log("School:   None (Global access)");
    console.log("==========================================");
}

createSuperAdmin().catch(console.error);
