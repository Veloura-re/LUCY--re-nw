/**
 * seed-full-school.js
 *
 * Builds a COMPLETE school around the 6 existing seed users:
 *   superadmin@lucy.edu   → SUPERADMIN  (no school needed)
 *   principal@lucy.edu    → PRINCIPAL
 *   teacher@lucy.edu      → TEACHER
 *   homeroom@lucy.edu     → HOMEROOM
 *   parent@lucy.edu       → PARENT
 *   student@lucy.edu      → STUDENT
 *
 * Creates:
 *   • 1 School  (Lucy Demo Academy)
 *   • 3 Grades  (Grade 9, 10, 11)
 *   • 2 Classes (10-A linked to homeroom teacher, 10-B)
 *   • 4 Subjects (Math, Science, English, History)
 *   • Teacher & Homeroom assignments
 *   • 1 Student record linked to student user
 *   • Parent ↔ Student link
 *   • 5 Periods (school day schedule)
 *   • Timetable entries
 *
 * Run: node scripts/seed-full-school.js
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuid } = require('uuid');
require('dotenv').config();

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function ok(label, error) {
    if (error) { console.error(`  ❌  ${label}: ${error.message}`); return false; }
    console.log(`  ✅  ${label}`);
    return true;
}

async function one(table, query) {
    const { data, error } = await sb.from(table).select('*').match(query).single();
    if (error) throw new Error(`${table} lookup failed: ${error.message}`);
    return data;
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   🏫  LUCY — FULL SCHOOL SEED               ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // ── 0. Load existing seed users ──────────────────────────────────────────
    console.log('📋  Loading seed users…');
    const { data: users, error: ue } = await sb.from('User').select('*');
    if (ue) throw new Error('Cannot load users: ' + ue.message);

    const byEmail = {};
    for (const u of users) byEmail[u.email] = u;

    const principal = byEmail['principal@lucy.edu'];
    const teacher   = byEmail['teacher@lucy.edu'];
    const homeroom  = byEmail['homeroom@lucy.edu'];
    const parent    = byEmail['parent@lucy.edu'];
    const student   = byEmail['student@lucy.edu'];

    for (const [name, u] of [['principal', principal], ['teacher', teacher], ['homeroom', homeroom], ['parent', parent], ['student', student]]) {
        if (!u) throw new Error(`Missing user: ${name}@lucy.edu — run nuke-and-seed.js first`);
    }
    console.log(`  ✅  Loaded ${users.length} users\n`);

    // ── 1. School ─────────────────────────────────────────────────────────────
    console.log('🏫  Creating school…');
    const schoolId = uuid();
    const { error: se } = await sb.from('School').insert({
        id: schoolId,
        name: 'Lucy Demo Academy',
        schoolCode: 'LUCY-DEMO-001',
        domain: '5-cn.net',
        status: 'ACTIVE',
        address: '123 Education Boulevard, Demo City',
        attendanceConfig: { type: 'PERIOD', lockAfterMinutes: 30, enableLateMarking: true },
        communicationsConfig: { replyTo: 'admin@5-cn.net', sendInvites: true, sendReports: true, sendInvoices: true },
        locations: [],
        createdAt: new Date().toISOString(),
    });
    if (!ok('School — Lucy Demo Academy', se)) process.exit(1);

    // ── 2. Assign non-superadmin users to school ──────────────────────────────
    console.log('\n👥  Assigning users to school…');
    for (const u of [principal, teacher, homeroom, parent, student]) {
        const { error } = await sb.from('User').update({ schoolId }).eq('id', u.id);
        ok(`Assigned ${u.role} (${u.email})`, error);
        u.schoolId = schoolId; // update local ref
    }

    // ── 3. Grades ─────────────────────────────────────────────────────────────
    console.log('\n📚  Creating grades…');
    const gradeIds = {};
    for (const [name, level] of [['Grade 9', 9], ['Grade 10', 10], ['Grade 11', 11]]) {
        const id = uuid();
        const { error } = await sb.from('Grade').insert({ id, schoolId, name, level });
        ok(`Grade — ${name}`, error);
        gradeIds[name] = id;
    }
    const grade10 = gradeIds['Grade 10'];

    // ── 4. Classes ────────────────────────────────────────────────────────────
    console.log('\n🏛  Creating classes…');
    const classAId = uuid();
    const classBId = uuid();
    const { error: ca } = await sb.from('Class').insert({
        id: classAId, gradeId: grade10, name: '10-A',
        homeroomTeacherId: homeroom.id, // homeroom teacher
    });
    ok('Class 10-A (homeroom: Mr. Carter)', ca);

    const { error: cb } = await sb.from('Class').insert({
        id: classBId, gradeId: grade10, name: '10-B',
        homeroomTeacherId: teacher.id,
    });
    ok('Class 10-B (homeroom: Ms. Johnson)', cb);

    // ── 5. Subjects ───────────────────────────────────────────────────────────
    console.log('\n📖  Creating subjects…');
    const subjects = {};
    for (const name of ['Mathematics', 'Science', 'English', 'History']) {
        const id = uuid();
        const { error } = await sb.from('Subject').insert({ id, schoolId, name });
        ok(`Subject — ${name}`, error);
        subjects[name] = id;
    }

    // ── 6. Teacher assignments ────────────────────────────────────────────────
    console.log('\n📝  Assigning teachers to class/subjects…');
    // Ms. Johnson (TEACHER) → 10-A: Math & Science
    for (const subj of ['Mathematics', 'Science']) {
        const { error } = await sb.from('TeacherAssignment').insert({
            id: uuid(), teacherId: teacher.id, classId: classAId, subjectId: subjects[subj],
        });
        ok(`TeacherAssignment: Ms. Johnson → 10-A / ${subj}`, error);
    }
    // Mr. Carter (HOMEROOM) → 10-A: English & History
    for (const subj of ['English', 'History']) {
        const { error } = await sb.from('TeacherAssignment').insert({
            id: uuid(), teacherId: homeroom.id, classId: classAId, subjectId: subjects[subj],
        });
        ok(`TeacherAssignment: Mr. Carter → 10-A / ${subj}`, error);
    }

    // ── 7. Periods (daily schedule) ───────────────────────────────────────────
    console.log('\n🕐  Creating periods…');
    const periodDefs = [
        { name: 'Period 1', startTime: '08:00', endTime: '09:00', isBreak: false, order: 1 },
        { name: 'Break',    startTime: '09:00', endTime: '09:20', isBreak: true,  order: 2 },
        { name: 'Period 2', startTime: '09:20', endTime: '10:20', isBreak: false, order: 3 },
        { name: 'Period 3', startTime: '10:30', endTime: '11:30', isBreak: false, order: 4 },
        { name: 'Lunch',    startTime: '11:30', endTime: '12:15', isBreak: true,  order: 5 },
        { name: 'Period 4', startTime: '12:15', endTime: '13:15', isBreak: false, order: 6 },
    ];
    const periodIds = {};
    for (const p of periodDefs) {
        const id = uuid();
        const { error } = await sb.from('Period').insert({ id, schoolId, ...p });
        ok(`Period — ${p.name}`, error);
        periodIds[p.name] = id;
    }

    // ── 8. Timetable (Mon–Fri, class 10-A) ───────────────────────────────────
    console.log('\n📅  Building timetable for 10-A…');
    const timetableEntries = [
        // Monday
        { dayOfWeek: 'MON', period: 'Period 1', subjectId: subjects['Mathematics'], teacherId: teacher.id },
        { dayOfWeek: 'MON', period: 'Period 2', subjectId: subjects['Science'],     teacherId: teacher.id },
        { dayOfWeek: 'MON', period: 'Period 3', subjectId: subjects['English'],     teacherId: homeroom.id },
        { dayOfWeek: 'MON', period: 'Period 4', subjectId: subjects['History'],     teacherId: homeroom.id },
        // Tuesday
        { dayOfWeek: 'TUE', period: 'Period 1', subjectId: subjects['English'],     teacherId: homeroom.id },
        { dayOfWeek: 'TUE', period: 'Period 2', subjectId: subjects['Mathematics'], teacherId: teacher.id },
        { dayOfWeek: 'TUE', period: 'Period 3', subjectId: subjects['History'],     teacherId: homeroom.id },
        { dayOfWeek: 'TUE', period: 'Period 4', subjectId: subjects['Science'],     teacherId: teacher.id },
    ];
    for (const e of timetableEntries) {
        const { error } = await sb.from('Timetable').insert({
            id: uuid(), classId: classAId, subjectId: e.subjectId,
            teacherId: e.teacherId, periodId: periodIds[e.period], dayOfWeek: e.dayOfWeek,
        });
        ok(`Timetable: ${e.dayOfWeek} ${e.period}`, error);
    }

    // ── 9. Student record ─────────────────────────────────────────────────────
    console.log('\n🎓  Creating student record…');
    const studentRecordId = uuid();
    const { error: sre } = await sb.from('Student').insert({
        id: studentRecordId,
        userId:    student.id,
        schoolId,
        gradeId:   grade10,
        classId:   classAId,
        firstName: 'Alex',
        lastName:  'Rivera',
        email:     'student@lucy.edu',
        studentCode: 'LUCY-STU-001',
        enrollmentStatus: 'ACTIVE',
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    ok('Student record — Alex Rivera (LUCY-STU-001)', sre);

    // ── 10. Parent ↔ Student link ─────────────────────────────────────────────
    console.log('\n👨‍👧  Linking parent to student…');
    const { error: ple } = await sb.from('ParentStudentLink').insert({
        id: uuid(),
        parentId:  parent.id,
        studentId: studentRecordId,
        pairingMethod: 'ADMIN',
        verifiedAt: new Date().toISOString(),
    });
    ok('ParentStudentLink — Jordan Rivera → Alex Rivera', ple);

    // ── 11. Fee Structure ─────────────────────────────────────────────────────
    console.log('\n💰  Creating fee structure…');
    const { error: fe } = await sb.from('FeeStructure').insert({
        id: uuid(), schoolId, name: 'Term Tuition', amount: 1500.00,
        category: 'TUITION', frequency: 'TERM',
        description: 'Standard term tuition fee',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    ok('FeeStructure — Term Tuition ($1,500)', fe);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║   🏫  LUCY DEMO ACADEMY — FULLY SEEDED                             ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║  School:   Lucy Demo Academy  (LUCY-DEMO-001)                      ║');
    console.log('║  Grades:   Grade 9, Grade 10, Grade 11                             ║');
    console.log('║  Classes:  10-A (homeroom: Mr. Carter), 10-B (homeroom: Ms. Johnson)║');
    console.log('║  Subjects: Mathematics, Science, English, History                  ║');
    console.log('║  Student:  Alex Rivera — class 10-A — code LUCY-STU-001            ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║  CREDENTIALS                                                        ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    const creds = [
        ['SUPERADMIN', 'superadmin@lucy.edu',  'Lucy@Admin2026!',     '(no school — global)'],
        ['PRINCIPAL',  'principal@lucy.edu',   'Lucy@Principal2026!', 'Lucy Demo Academy'],
        ['TEACHER',    'teacher@lucy.edu',     'Lucy@Teacher2026!',   'Lucy Demo Academy'],
        ['HOMEROOM',   'homeroom@lucy.edu',    'Lucy@Homeroom2026!',  'Lucy Demo Academy'],
        ['PARENT',     'parent@lucy.edu',      'Lucy@Parent2026!',    'Lucy Demo Academy'],
        ['STUDENT',    'student@lucy.edu',     'Lucy@Student2026!',   'Lucy Demo Academy'],
    ];
    for (const [role, email, pass, note] of creds) {
        console.log(`║  ${role.padEnd(11)} ${email.padEnd(26)} ${pass.padEnd(22)} ║`);
    }
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║  🌐  https://5-cn.net/login                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
}

main().catch(e => {
    console.error('\n❌  FATAL:', e.message);
    process.exit(1);
});
