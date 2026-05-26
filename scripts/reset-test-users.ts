/**
 * LUCY — Full Test User Reset (Supabase REST only, no Prisma)
 * Run: npx ts-node --skip-project --transpile-only --compiler-options '{"module":"commonjs","moduleResolution":"node"}' scripts/reset-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Known IDs from the live DB ─────────────────────────────────
const SCHOOL_ID  = 'c4020909-c825-4490-9790-18e0632dbeaf';
const CLASS_ID   = '236fec34-4920-4fc2-b9a3-493964b388d8';
const SUBJECT_ID = '86d4922f-4b6b-45ec-9fac-fcd0841d2a1a';

const TEST_EMAILS = [
    'superadmin@lucy.edu',
    'principal@lucy.edu',
    'teacher@lucy.edu',
    'student@lucy.edu',
    'parent@lucy.edu',
];

// ─── Helpers ─────────────────────────────────────────────────────
function log(msg: string) { console.log(msg); }
function ok(msg: string)  { console.log('  ✅ ' + msg); }
function info(msg: string){ console.log('  ℹ  ' + msg); }
function warn(msg: string){ console.log('  ⚠  ' + msg); }

async function deleteUser(email: string) {
    // 1. Get Supabase auth user
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUser = (users as any[]).find(u => u.email === email);

    // 2. Get DB user record
    const { data: dbUser } = await supabase.from('User').select('id').eq('email', email).maybeSingle();

    if (dbUser?.id) {
        // Delete in FK-safe order via REST
        await supabase.from('Student').delete().eq('userId', dbUser.id);
        await supabase.from('TeacherAssignment').delete().eq('teacherId', dbUser.id);
        await supabase.from('StaffAttendanceRecord').delete().eq('userId', dbUser.id);
        await supabase.from('InviteToken').delete().eq('email', email);
        try { await supabase.from('Session').delete().eq('userId', dbUser.id); } catch {}
        await supabase.from('User').delete().eq('id', dbUser.id);
        info(`Deleted DB record: ${email}`);
    } else {
        info(`No DB record: ${email}`);
    }

    if (authUser) {
        const { error } = await supabase.auth.admin.deleteUser(authUser.id);
        if (error) warn(`Auth delete failed for ${email}: ${error.message}`);
        else info(`Deleted auth user: ${email}`);
    } else {
        info(`No auth account: ${email}`);
    }
}

async function createUser(email: string, password: string, name: string, role: string) {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, name }
    });
    if (error || !data?.user) throw new Error(`Auth create failed for ${email}: ${error?.message}`);

    const { error: dbErr } = await supabase.from('User').insert({
        id: data.user.id,
        email,
        name,
        role,
        schoolId: role === 'SUPERADMIN' ? null : SCHOOL_ID,
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    if (dbErr) throw new Error(`DB create failed for ${email}: ${dbErr.message}`);

    return data.user.id;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
    console.log('\n════════════════════════════════════════');
    console.log('  🔄  LUCY TEST USER RESET');
    console.log('════════════════════════════════════════\n');

    // Verify school
    const { data: school } = await supabase.from('School').select('name').eq('id', SCHOOL_ID).single();
    if (!school) throw new Error(`School ${SCHOOL_ID} not found in DB.`);
    ok(`School confirmed: ${school.name}\n`);

    // ── Delete all existing test users ──
    log('🗑  Deleting existing test users...');
    for (const email of TEST_EMAILS) await deleteUser(email);
    console.log('');

    // ── Recreate: SuperAdmin ──
    log('👑 Creating SuperAdmin...');
    await createUser('superadmin@lucy.edu', 'Lucy@Admin2026!', 'Super Admin', 'SUPERADMIN');
    ok('superadmin@lucy.edu\n');

    // ── Recreate: Principal ──
    log('🏫 Creating Principal...');
    await createUser('principal@lucy.edu', 'Lucy@Principal2026!', 'Principal Morgan', 'PRINCIPAL');
    ok('principal@lucy.edu\n');

    // ── Recreate: Teacher ──
    log('👩‍🏫 Creating Teacher...');
    const teacherId = await createUser('teacher@lucy.edu', 'Lucy@Teacher2026!', 'Ms. Johnson', 'TEACHER');
    // Assign to class/subject
    await supabase.from('TeacherAssignment').insert({
        teacherId,
        classId: CLASS_ID,
        subjectId: SUBJECT_ID,
        createdAt: new Date().toISOString(),
    });
    ok('teacher@lucy.edu → assigned to class\n');

    // ── Recreate: Student ──
    log('🎓 Creating Student...');
    const studentUserId = await createUser('student@lucy.edu', 'Lucy@Student2026!', 'Alex Rivera', 'STUDENT');
    // Get grade for this class
    const { data: classData } = await supabase.from('Class').select('gradeId').eq('id', CLASS_ID).single();
    const studentCode = 'STU-' + Math.floor(1000 + Math.random() * 9000);
    await supabase.from('Student').insert({
        userId: studentUserId,
        schoolId: SCHOOL_ID,
        gradeId: classData?.gradeId || null,
        classId: CLASS_ID,
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'student@lucy.edu',
        studentCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    ok(`student@lucy.edu → code: ${studentCode}\n`);

    // ── Recreate: Parent ──
    log('👪 Creating Parent...');
    await createUser('parent@lucy.edu', 'Lucy@Parent2026!', 'Jordan Rivera', 'PARENT');
    ok('parent@lucy.edu\n');

    // ── Print credentials ──
    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅  ALL USERS RESET — CREDENTIALS BELOW');
    console.log('════════════════════════════════════════════════════════════\n');
    const creds = [
        { role: 'SuperAdmin',  email: 'superadmin@lucy.edu',  password: 'Lucy@Admin2026!'     },
        { role: 'Principal',   email: 'principal@lucy.edu',   password: 'Lucy@Principal2026!' },
        { role: 'Teacher',     email: 'teacher@lucy.edu',     password: 'Lucy@Teacher2026!'   },
        { role: 'Student',     email: 'student@lucy.edu',     password: 'Lucy@Student2026!'   },
        { role: 'Parent',      email: 'parent@lucy.edu',      password: 'Lucy@Parent2026!'    },
    ];

    creds.forEach(c => {
        console.log(`  ${c.role.padEnd(11)} │ ${c.email.padEnd(26)} │ ${c.password}`);
    });
    console.log(`\n  🌐  Login at: https://5-cn.net/login\n`);
}

main().catch(e => {
    console.error('\n❌ Reset failed:', e.message || e);
    process.exit(1);
});
