const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function provisionAuth() {
    const users = [
        { email: 'commander@lucy.edu', password: 'LUCY_Admin_Password!@#2026_Secure', metadata: { role: 'PRINCIPAL', name: 'Neural Commander' } },
        { email: 'teacher@neural.edu', password: 'Neural_Teacher_2026!', metadata: { role: 'TEACHER', name: 'Professor Neural' } },
        { email: 'parent@neural.edu', password: 'Neural_Parent_2026!', metadata: { role: 'PARENT', name: 'Parent Observation Node' } },
        { email: 'student@neural.edu', password: 'Neural_Student_2026!', metadata: { role: 'STUDENT', name: 'Neural Student' } }
    ];

    for (const u of users) {
        console.log(`Provisioning Auth for: ${u.email}`);
        const { data, error } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: u.metadata
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log(`User ${u.email} already exists in Auth. Updating...`);
                // Find user ID
                const { data: { users: list } } = await supabase.auth.admin.listUsers();
                const user = list.find(au => au.email === u.email);
                if (user) {
                    await supabase.auth.admin.updateUserById(user.id, {
                        password: u.password,
                        user_metadata: u.metadata
                    });
                }
            } else {
                console.error(`Error for ${u.email}:`, error.message);
            }
        } else {
            console.log(`Successfully created ${u.email}`);
        }
    }
}

provisionAuth();
