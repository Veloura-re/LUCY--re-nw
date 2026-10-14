/**
 * nuke-and-seed.js
 * 
 * 1. Deletes ALL users from Supabase Auth + the User table
 * 2. Deletes ALL schools (cascades everything underneath)
 * 3. Creates one seed user per role:
 *    SUPERADMIN | PRINCIPAL | TEACHER | HOMEROOM | PARENT | STUDENT
 *
 * Run: node scripts/nuke-and-seed.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
require('./_guard').requireWipeConfirmation('nuke-and-seed');

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad(str, n) { return String(str).padEnd(n); }

async function nukeAllAuthUsers() {
    console.log('\n🗑  Fetching all Auth users…');
    let page = 1;
    let deleted = 0;
    while (true) {
        const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) { console.warn('  ⚠  listUsers error:', error.message); break; }
        const users = data?.users ?? [];
        if (users.length === 0) break;
        console.log(`    Page ${page}: ${users.length} auth users`);
        for (const u of users) {
            const { error: de } = await sb.auth.admin.deleteUser(u.id);
            if (de) console.warn(`    ⚠  Auth delete ${u.email}: ${de.message}`);
            else deleted++;
        }
        if (users.length < 1000) break;
        page++;
    }
    console.log(`  ✅  Deleted ${deleted} auth accounts`);
}

async function nukeAllDbUsers() {
    console.log('\n🗑  Purging User table…');
    // Delete dependents that don't auto-cascade
    const tables = [
        'StaffPayroll',
        'StaffAttendanceRecord',
        'ResourceProgress',
        'MarklistConfig',
        'Lesson',
        'Certificate',
        'AuditLog',
        'BookRequest',
        'Event',
        'Assignment',
        'AssignmentSubmission',
        'StudentRemark',
        'InternalNote',
        'TeacherAssignment',
        'Timetable',
        'ChatRoomMember',
        'Message',
        'AbsenceAuthorization',
        'GradeRecord',
        'ExamAttempt',
        'AttendanceRecord',
        'ParentStudentLink',
        'Student',
    ];

    for (const t of tables) {
        // deleteMany equivalent — delete all rows
        const { error } = await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.warn(`    ⚠  ${t}: ${error.message}`);
        else console.log(`    ✓  ${t} cleared`);
    }

    const { error } = await sb.from('User').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.warn('    ⚠  User:', error.message);
    else console.log('    ✓  User cleared');
}

async function nukeAllSchools() {
    console.log('\n🗑  Purging Schools…');
    // Most school-related records should be gone after nuking users/students.
    // Clean remaining child tables then schools.
    const schoolTables = [
        'ChatRoom',
        'Period',
        'FeeStructure',
        'Invoice',
        'Grade',
        'Subject',
        'UnitPack',
        'Exam',
    ];
    for (const t of schoolTables) {
        const { error } = await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.warn(`    ⚠  ${t}: ${error.message}`);
        else console.log(`    ✓  ${t} cleared`);
    }

    const { error } = await sb.from('School').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.warn('    ⚠  School:', error.message);
    else console.log('    ✓  School cleared');
}

async function mkUser(email, password, name, role, extra = {}) {
    // Create Supabase Auth user
    const { data, error: ae } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, name },
    });
    if (ae) throw new Error(`Auth create failed for ${email}: ${ae.message}`);

    // Insert into User table
    const { error: de } = await sb.from('User').insert({
        id: data.user.id,
        email,
        name,
        role,
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...extra,
    });
    if (de) throw new Error(`DB insert failed for ${email}: ${de.message}`);

    return data.user.id;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   🚨  LUCY — NUKE & SEED                    ║');
    console.log('╚══════════════════════════════════════════════╝');

    // ── Step 1: Wipe everything ───────────────────────────────────────────────
    await nukeAllDbUsers();
    await nukeAllSchools();
    await nukeAllAuthUsers();

    // ── Step 2: Seed one user per role ────────────────────────────────────────
    console.log('\n✨  Creating seed users…\n');

    const users = [
        // [email, password, name, role]
        ['principal@lucy.edu',   'Lucy@Principal2026!', 'Principal Morgan',  'PRINCIPAL'],
        ['teacher@lucy.edu',     'Lucy@Teacher2026!',   'Ms. Johnson',       'TEACHER'],
        ['homeroom@lucy.edu',    'Lucy@Homeroom2026!',  'Mr. Carter',        'HOMEROOM'],
        ['parent@lucy.edu',      'Lucy@Parent2026!',    'Jordan Rivera',     'PARENT'],
        ['student@lucy.edu',     'Lucy@Student2026!',   'Alex Rivera',       'STUDENT'],
    ];

    const created = [];
    for (const [email, password, name, role] of users) {
        try {
            const id = await mkUser(email, password, name, role);
            created.push({ role, email, password, id });
            console.log(`  ✅  ${pad(role, 12)}  ${email}`);
        } catch (e) {
            console.error(`  ❌  ${pad(role, 12)}  ${email}  →  ${e.message}`);
        }
    }

    // ── Step 3: Credentials summary ───────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║   ✅  SEED COMPLETE — LOGIN CREDENTIALS                         ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║  ${'Role'.padEnd(14)} ${'Email'.padEnd(26)} ${'Password'.padEnd(22)} ║`);
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    for (const { role, email, password } of created) {
        console.log(`║  ${pad(role, 14)} ${pad(email, 26)} ${pad(password, 22)} ║`);
    }
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log('║  🌐  Login: https://5-cn.net/login                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

main().catch(e => {
    console.error('\n❌  FATAL:', e.message);
    process.exit(1);
});
