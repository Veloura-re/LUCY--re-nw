const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCHOOL = 'c4020909-c825-4490-9790-18e0632dbeaf';
const CLASS  = '236fec34-4920-4fc2-b9a3-493964b388d8';
const SUBJ   = '86d4922f-4b6b-45ec-9fac-fcd0841d2a1a';

const TEST_EMAILS = [
    'principal@lucy.edu',
    'teacher@lucy.edu',
    'student@lucy.edu',
    'parent@lucy.edu',
];

async function mkUser(email, pass, name, role) {
    const { data, error } = await sb.auth.admin.createUser({
        email, password: pass, email_confirm: true,
        user_metadata: { role, name }
    });
    if (error) throw new Error('Auth failed: ' + email + ' — ' + error.message);
    const { error: de } = await sb.from('User').insert({
        id: data.user.id, email, name, role,
        schoolId: role === 'SUPERADMIN' ? null : SCHOOL,
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    if (de) throw new Error('DB failed: ' + email + ' — ' + de.message);
    console.log('  ✅ Created', role, '-', email);
    return data.user.id;
}

async function main() {
    console.log('\n══════════════════════════════════════════════');
    console.log('  🔄  LUCY FULL USER RESET');
    console.log('══════════════════════════════════════════════\n');

    // ── Step 1: Nuke all DB rows ──
    console.log('🗑  Purging DB rows...');
    for (const email of TEST_EMAILS) {
        const { data: rows } = await sb.from('User').select('id').eq('email', email);
        for (const row of (rows || [])) {
            await sb.from('Student').delete().eq('userId', row.id);
            await sb.from('TeacherAssignment').delete().eq('teacherId', row.id);
            await sb.from('Assignment').delete().eq('teacherId', row.id);
            await sb.from('StaffAttendanceRecord').delete().eq('userId', row.id);
            await sb.from('AssignmentSubmission').delete().eq('studentId', row.id);
        }
        const { error } = await sb.from('User').delete().eq('email', email);
        console.log(' ', email, '->', error ? '⚠ ' + error.message : 'cleaned');
    }

    // ── Step 2: Nuke all auth accounts ──
    console.log('\n🗑  Purging Auth accounts...');
    const { data: authData } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = authData ? authData.users : [];
    for (const u of allUsers) {
        if (TEST_EMAILS.includes(u.email || '')) {
            const { error } = await sb.auth.admin.deleteUser(u.id);
            console.log(' ', u.email, '->', error ? '⚠ ' + error.message : 'deleted');
        }
    }

    // ── Step 3: Recreate all users ──
    console.log('\n✨ Creating fresh users...');
    await mkUser('principal@lucy.edu',  'Lucy@Principal2026!', 'Principal Morgan',  'PRINCIPAL');

    const teacherId = await mkUser('teacher@lucy.edu', 'Lucy@Teacher2026!', 'Ms. Johnson', 'TEACHER');
    await sb.from('TeacherAssignment').insert({
        teacherId, classId: CLASS, subjectId: SUBJ,
        createdAt: new Date().toISOString(),
    });
    console.log('     → Assigned to class');

    const studentUserId = await mkUser('student@lucy.edu', 'Lucy@Student2026!', 'Alex Rivera', 'STUDENT');
    const { data: cls } = await sb.from('Class').select('gradeId').eq('id', CLASS).single();
    const code = 'STU-' + Math.floor(1000 + Math.random() * 9000);
    await sb.from('Student').insert({
        userId: studentUserId, schoolId: SCHOOL,
        gradeId: cls ? cls.gradeId : null,
        classId: CLASS,
        firstName: 'Alex', lastName: 'Rivera',
        email: 'student@lucy.edu', studentCode: code,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    console.log('     → Student code:', code);

    await mkUser('parent@lucy.edu', 'Lucy@Parent2026!', 'Jordan Rivera', 'PARENT');

    // ── Final credentials summary ──
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  ✅  ALL USERS RESET — CREDENTIALS');
    console.log('══════════════════════════════════════════════════════════\n');
    const creds = [
        ['Principal',   'principal@lucy.edu',   'Lucy@Principal2026!'],
        ['Teacher',     'teacher@lucy.edu',     'Lucy@Teacher2026!'],
        ['Student',     'student@lucy.edu',     'Lucy@Student2026!'],
        ['Parent',      'parent@lucy.edu',      'Lucy@Parent2026!'],
    ];
    creds.forEach(([role, email, pass]) => {
        console.log(`  ${role.padEnd(12)} ${email.padEnd(28)} ${pass}`);
    });
    console.log('\n  🌐  Login: https://5-cn.net/login\n');
}

main().catch(e => {
    console.error('\n❌ FAILED:', e.message);
    process.exit(1);
});
