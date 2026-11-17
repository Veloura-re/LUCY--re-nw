// Live end-to-end security run. Creates clearly tagged test schools and users in the configured
// Supabase project, attacks the production build of the app, then deletes everything it created.
//
//   npm run build
//   E2E_ALLOW_LIVE=yes node scripts/e2e/run.mjs
//
// Email is captured by a local mock of Resend, so nothing is mailed. Stripe, Chapa and Gemini routes are
// never called. Refuses to run without E2E_ALLOW_LIVE=yes because it writes to the real database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { ROOT, loadEnv, Client, startMockResend, startApp, Report, deleteUsersEverywhere } from './lib.mjs';
import { groupFuzz, groupRaces, groupTokens, groupUploads, groupSizes } from './deep.mjs';
import { groupUi } from './ui.mjs';

if (process.env.E2E_ALLOW_LIVE !== 'yes') {
    console.error('Refusing to run: this writes tagged test data to the live database. Set E2E_ALLOW_LIVE=yes.');
    process.exit(2);
}

const env = loadEnv();
const PORT = 3100;
const MAIL_PORT = 4010;
const tag = `zztest${Date.now().toString(36)}`;
const PW = `Zz!${crypto.randomBytes(8).toString('hex')}Aa1`;
const ZERO = '00000000-0000-0000-0000-000000000000';
const OUT = process.env.E2E_OUT || '/tmp';
const report = new Report();
const mail = startMockResend(MAIL_PORT);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL || env.DIRECT_URL, ssl: { rejectUnauthorized: false }, max: 3, statement_timeout: 10000, query_timeout: 10000, connectionTimeoutMillis: 10000 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const created = { authIds: [], schoolIds: [], userIds: [] };
const U = {}; // role key -> { id, email }
const S = {}; // seeded ids
let app;

const email = (key) => `${tag}.${key}@lucy-e2e.example`;

// ------------------------------------------------------------------ seeding
async function makeUser(key, role, schoolId, { emailOverride } = {}) {
    const addr = emailOverride || email(key);
    const { data, error } = await admin.auth.admin.createUser({ email: addr, password: PW, email_confirm: true });
    if (error) throw new Error(`createUser ${key}: ${error.message}`);
    created.authIds.push(data.user.id);
    await prisma.user.create({
        data: { id: data.user.id, email: addr, name: `ZZTEST ${key} ${tag}`, role, schoolId, verified: true, legalVersionAccepted: '2026-10-31' },
    });
    created.userIds.push(data.user.id);
    U[key] = { id: data.user.id, email: addr, role };
    return U[key];
}

async function seed() {
    const soon = new Date(Date.now() + 90 * 864e5);
    const mkSchool = async (k) => {
        const s = await prisma.school.create({ data: { name: `ZZTEST School ${k} ${tag}`, schoolCode: `ZZ${tag}${k}`.toUpperCase(), status: 'ACTIVE', trialEndsAt: soon } });
        created.schoolIds.push(s.id);
        return s;
    };
    S.schoolA = (await mkSchool('A')).id;
    S.schoolB = (await mkSchool('B')).id;

    await makeUser('superadmin', 'SUPERADMIN', null);
    for (const [k, role] of [['owner', 'OWNER'], ['principal', 'PRINCIPAL'], ['teacher', 'TEACHER'], ['teacher2', 'TEACHER'], ['accountant', 'ACCOUNTANT'], ['recorder', 'RECORDER'], ['student', 'STUDENT'], ['parent', 'PARENT']]) {
        await makeUser(k, role, S.schoolA);
    }
    await makeUser('ownerB', 'OWNER', S.schoolB);
    await makeUser('teacherB', 'TEACHER', S.schoolB);

    const gA = await prisma.grade.create({ data: { schoolId: S.schoolA, name: `ZZ Grade ${tag}`, level: 1 } });
    const gB = await prisma.grade.create({ data: { schoolId: S.schoolB, name: `ZZ Grade ${tag}`, level: 1 } });
    const cA = await prisma.class.create({ data: { gradeId: gA.id, schoolId: S.schoolA, name: `ZZ Class ${tag}`, homeroomTeacherId: U.teacher.id } });
    const cB = await prisma.class.create({ data: { gradeId: gB.id, schoolId: S.schoolB, name: `ZZ Class ${tag}`, homeroomTeacherId: U.teacherB.id } });
    S.classA = cA.id; S.classB = cB.id;
    await prisma.academicTerm.create({ data: { schoolId: S.schoolA, name: `ZZ Term ${tag}`, startDate: new Date(Date.now() - 30 * 864e5), endDate: soon, isActive: true } });

    const code = (n) => `ST-ZZ${crypto.randomBytes(3).toString('hex').toUpperCase()}${n}-2026`;
    const mkStudent = (extra) => prisma.student.create({ data: { dob: new Date('2012-03-04'), enrollmentStatus: 'ACTIVE', ...extra } });
    const a1 = await mkStudent({ schoolId: S.schoolA, gradeId: gA.id, classId: cA.id, firstName: 'Zed', lastName: 'Atest', studentCode: code(1), userId: U.student.id });
    const a2 = await mkStudent({ schoolId: S.schoolA, gradeId: gA.id, classId: cA.id, firstName: 'Zoe', lastName: 'Btest', studentCode: code(2) });
    const b1 = await mkStudent({ schoolId: S.schoolB, gradeId: gB.id, classId: cB.id, firstName: 'Zia', lastName: 'Ctest', studentCode: code(3) });
    const a3 = await mkStudent({ schoolId: S.schoolA, gradeId: gA.id, classId: cA.id, firstName: 'Zane', lastName: 'Dtest', studentCode: code(4) });
    S.a3Code = a3.studentCode;
    await prisma.absenceAuthorization.create({ data: { studentId: a3.id, requestorId: U.principal.id, startDate: new Date(), endDate: new Date(Date.now() + 864e5), reason: 'ZZTEST private reason', status: 'PENDING' } });
    Object.assign(S, { a1: a1.id, a1Code: a1.studentCode, a2: a2.id, a2Code: a2.studentCode, b1: b1.id });

    await prisma.parentStudentLink.create({ data: { parentId: U.parent.id, studentId: a1.id, verifiedAt: new Date(), pairingMethod: 'CODE' } });
    const invA = await prisma.invoice.create({ data: { studentId: a1.id, schoolId: S.schoolA, amount: 1000, dueDate: soon } });
    const invB = await prisma.invoice.create({ data: { studentId: b1.id, schoolId: S.schoolB, amount: 500, dueDate: soon } });
    S.invA = invA.id; S.invB = invB.id;
    const payA = await prisma.payment.create({ data: { invoiceId: invA.id, amount: 1000, method: 'CASH', status: 'PENDING' } });
    S.payA = payA.id;
    await prisma.internalNote.create({ data: { studentId: a1.id, authorId: U.teacher.id, content: `ZZTEST confidential ${tag}` } });
}

// ------------------------------------------------------------------ sessions
async function signIn(client, who, { remember = false } = {}) {
    const since = Date.now() - 50;
    const res = await client.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    if (!res.data?.otpRequired) return { res, otp: false };
    let code = null;
    for (let i = 0; i < 20 && !code; i++) { code = mail.latestCode(who.email, since); if (!code) await new Promise((r) => setTimeout(r, 150)); }
    const v = await client.post('/api/auth/verify-otp', { code, rememberDevice: remember });
    return { res: v, otp: true, code };
}

const sessions = {};
async function loginAll() {
    for (const k of Object.keys(U)) {
        if (k === 'teacher2') continue; // kept fresh for the OTP tests
        const c = new Client(app.base, k);
        const r = await signIn(c, U[k]);
        report.check('login', `${k} signs in (password + emailed code)`, r.res.status === 200 && c.jar.has('lucy_device_session') && c.jar.has('lucy_device_mark'), `status ${r.res.status}`);
        sessions[k] = c;
    }
}

// Direct sign-in against Supabase Auth with the public key, the way an attacker with a stolen password would.
async function goTrueClient(who) {
    const c = new Client(app.base, `gotrue-${who.role}`);
    const supa = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: { getAll: () => [...c.jar].map(([name, value]) => ({ name, value })), setAll: (list) => list.forEach(({ name, value }) => c.jar.set(name, value)) },
    });
    const { data, error } = await supa.auth.signInWithPassword({ email: who.email, password: PW });
    if (error) throw new Error('GoTrue direct login failed: ' + error.message);
    return { client: c, token: data.session.access_token };
}

// ------------------------------------------------------------------ route inventory
const walk = (dir, pred, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, pred, out); else if (pred(p)) out.push(p);
    }
    return out;
};
const toUrl = (file, base) => '/' + path.relative(path.join(ROOT, base), path.dirname(file)).split(path.sep).filter((s) => s && !/^\(.*\)$/.test(s)).join('/');
const fill = (url) => url.replace(/\[\.\.\.(\w+)\]/g, 'x/y').replace(/\[(\w+)\]/g, (_m, name) => ({ studentId: S.a1, bucket: 'school-assets' }[name] || ZERO));

const ROLE_SETS = (() => {
    const ADMIN = ['OWNER', 'PRINCIPAL', 'SUPERADMIN'], TEACHER = ['TEACHER', 'HOMEROOM'];
    const STAFF = [...ADMIN, ...TEACHER];
    return {
        ADMIN_ROLES: ADMIN, TEACHER_ROLES: TEACHER, STAFF_ROLES: STAFF,
        ALL_ROLES: [...STAFF, 'PARENT', 'STUDENT', 'ACCOUNTANT', 'RECORDER'],
        FINANCE_ROLES: [...ADMIN, 'ACCOUNTANT'], RECORDS_ROLES: [...ADMIN, 'RECORDER'], REGISTRY_ROLES: [...STAFF, 'RECORDER'], DIRECTOR_ROLES: ['OWNER', 'PRINCIPAL'],
    };
})();

function getHandlerBody(src) {
    const start = src.search(/export (async function|const) GET\b/);
    if (start < 0) return '';
    const rest = src.slice(start + 10);
    const next = rest.search(/\n(?:export )?(?:async )?function \w+|\nexport (?:const|async function) \w+/);
    return next < 0 ? rest : rest.slice(0, next);
}

function parseRoleSets(src) {
    src = getHandlerBody(src);
    const sets = new Set();
    const re = /requireRole\(\s*(\[[^\]]*\]|[A-Z_]+)\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
        const roles = new Set();
        for (const t of m[1].match(/'[A-Z]+'|"[A-Z]+"|[A-Z_]{4,}/g) || []) {
            const name = t.replace(/['"]/g, '');
            if (ROLE_SETS[name]) ROLE_SETS[name].forEach((r) => roles.add(r)); else roles.add(name);
        }
        sets.add([...roles].sort().join(','));
    }
    return [...sets];
}

const PUBLIC_API = /^\/api\/(auth\/(forgot-password|login|register-admin|register\/student|test-db|validate-key|verify-code|verify-otp|resend-otp|accept-terms|register-parent)|debug-ingest|dir\/register|health|public\/|uplink|webhooks\/|client-error|diagnostic|test-edge|cron\/|school\/finance\/webhooks)/;

function classifyPage(res) {
    if (res.status >= 300 && res.status < 400) return { kind: 'redirect', to: res.location };
    const meta = res.text.match(/http-equiv="refresh"[^>]*content="\d+;url=([^"]+)"/);
    if (meta) return { kind: 'redirect', to: meta[1] };
    if (res.status === 200) return { kind: 'page' };
    return { kind: String(res.status) };
}

// ------------------------------------------------------------------ test groups
async function groupPublicSurface() {
    const anon = new Client(app.base, 'anon');
    const pages = walk(path.join(ROOT, 'app'), (p) => p.endsWith(`${path.sep}page.tsx`)).map((f) => toUrl(f, 'app'));
    let bad = [];
    for (const url of pages) {
        const r = await anon.get(fill(url));
        const c = classifyPage(r);
        const protectedPrefix = /^\/(dashboard|admin|exam)(\/|$)/.test(url);
        if (r.status >= 500) bad.push(`${url} -> ${r.status}`);
        else if (protectedPrefix && !(c.kind === 'redirect' && /\/login/.test(c.to || ''))) bad.push(`${url} protected but -> ${r.status} ${c.to || ''}`);
    }
    report.check('anonymous', `${pages.length} pages: protected areas redirect to login, nothing returns 5xx`, bad.length === 0, bad.join(' | '));

    const routes = walk(path.join(ROOT, 'app/api'), (p) => p.endsWith(`${path.sep}route.ts`));
    bad = [];
    for (const f of routes) {
        const url = toUrl(f, 'app'), src = fs.readFileSync(f, 'utf8');
        if (PUBLIC_API.test(url)) continue;
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((m) => new RegExp(`export (async function|const) ${m}\\b`).test(src));
        for (const m of methods) {
            const r = await anon.req(m, fill(url), m === 'GET' ? {} : { json: {} });
            if (r.status === 200 || r.status >= 500) bad.push(`${m} ${url} -> ${r.status}`);
        }
    }
    report.check('anonymous', 'every non-public API route refuses unauthenticated callers (no 200, no 5xx)', bad.length === 0, bad.join(' | '));
}

async function groupGateBypass() {
    const who = U.teacher;
    const { client: gt, token } = await goTrueClient(who);
    const dash = await gt.get('/dashboard');
    report.check('session gate', 'a session from Supabase Auth directly cannot open /dashboard', dash.status === 307 && /\/logout/.test(dash.location || ''), `${dash.status} ${dash.location}`);
    for (const p of ['/api/user/settings', '/api/school/students', '/api/messages/user?q=a', '/api/student/timetable']) {
        const r = await gt.get(p);
        report.check('session gate', `direct Supabase session refused on GET ${p}`, r.status === 401, `status ${r.status}`);
    }
    const w = await gt.post('/api/school/finance/pay/verify', { paymentId: S.payA, status: 'SUCCESS' });
    report.check('session gate', 'direct Supabase session cannot confirm a payment', w.status === 401, `status ${w.status}`);
    const exam = await gt.get('/exam/' + ZERO);
    report.check('session gate', 'direct Supabase session cannot open /exam', exam.status === 307 && /\/logout/.test(exam.location || ''), `${exam.status} ${exam.location}`);

    const bearer = new Client(app.base, 'bearer');
    const b = await bearer.get('/api/user/settings', { headers: { authorization: `Bearer ${token}` } });
    report.check('session gate', 'a bearer access token alone is refused', b.status === 401, `status ${b.status}`);

    const forged = new Client(app.base, 'forged'); gt.jar.forEach((v, k) => forged.jar.set(k, v));
    forged.jar.set('lucy_device_session', crypto.randomUUID()); forged.jar.set('lucy_device_mark', crypto.randomBytes(32).toString('hex'));
    const f1 = await forged.get('/dashboard'); const f2 = await forged.get('/api/user/settings');
    report.check('session gate', 'forged device cookie and mark are refused (page and API)', f1.status === 307 && /\/logout/.test(f1.location || '') && f2.status === 401, `${f1.status} ${f1.location} / ${f2.status}`);

    const legacy = new Client(app.base, 'legacy'); gt.jar.forEach((v, k) => legacy.jar.set(k, v));
    legacy.jar.set('lucy_device_session', crypto.randomUUID());
    const l1 = await legacy.get('/dashboard');
    const l2 = l1.location ? await legacy.get(l1.location.replace(app.base, '')) : null;
    report.check('session gate', 'a guessed legacy cookie is sent to the upgrade check and rejected there', /\/auth\/upgrade/.test(l1.location || '') && /\/logout/.test(l2?.location || ''), `${l1.location} -> ${l2?.location}`);

    const rs = await new Client(app.base, 'x').post('/api/auth/register-session', {});
    report.check('session gate', 'the removed register-session route is gone', [404, 405].includes(rs.status), `status ${rs.status}`);
}

async function groupOtp() {
    const who = U.teacher2;
    const c = new Client(app.base, 'otp');
    const t0 = Date.now() - 50;
    const login = await c.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', 'correct password asks for a code instead of signing in', login.data?.otpRequired === true && !c.jar.has('lucy_device_session'), JSON.stringify(login.data));
    const mailed = mail.latestCode(who.email, t0);
    report.check('emailed code', 'a 6-digit code was emailed (captured by the mock)', /^\d{6}$/.test(mailed || ''), String(mailed));
    const early = await c.get('/api/user/settings');
    report.check('emailed code', 'the password-only session is unusable before the code', early.status === 401, `status ${early.status}`);

    const wrong = mailed === '000000' ? '111111' : '000000';
    const tries = [];
    for (let i = 0; i < 5; i++) tries.push((await c.post('/api/auth/verify-otp', { code: wrong })).status);
    report.check('emailed code', 'five wrong codes are rejected', tries.every((s) => s === 400), tries.join(','));
    const locked = await c.post('/api/auth/verify-otp', { code: mailed });
    report.check('emailed code', 'after five wrong guesses even the right code is locked out', locked.status === 429, `status ${locked.status}`);
    const resend = await c.post('/api/auth/resend-otp', {});
    report.check('emailed code', 'resending right away is blocked by the cooldown', resend.status === 429, `status ${resend.status}`);
    const malformed = await c.post('/api/auth/verify-otp', { code: '12ab56' });
    report.check('emailed code', 'a non-numeric code is rejected', malformed.status === 400, `status ${malformed.status}`);

    const c2 = new Client(app.base, 'otp2');
    const r2 = await signIn(c2, who, { remember: true });
    report.check('emailed code', 'a fresh login with the right code succeeds and sets the device session', r2.res.status === 200 && c2.jar.has('lucy_device_session'), `status ${r2.res.status}`);
    const reuse = await c2.post('/api/auth/verify-otp', { code: r2.code });
    report.check('emailed code', 'the same code cannot be used twice', reuse.status === 400, `status ${reuse.status}`);
    const ok = await c2.get('/api/user/settings');
    report.check('emailed code', 'after the code the API works', ok.status === 200, `status ${ok.status}`);
    report.check('emailed code', 'a trusted-device cookie was set because it was requested', c2.jar.has('lucy_trusted_device'), '');

    const trustedOnly = new Client(app.base, 'trusted');
    trustedOnly.jar.set('lucy_trusted_device', c2.jar.get('lucy_trusted_device'));
    const t = await trustedOnly.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', 'a trusted device skips the code', t.status === 200 && t.data?.otpRequired !== true && trustedOnly.jar.has('lucy_device_session'), JSON.stringify(t.data));

    const other = new Client(app.base, 'borrowed');
    other.jar.set('lucy_trusted_device', c2.jar.get('lucy_trusted_device'));
    const o = await other.post('/api/auth/login', { email: U.parent.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', "another user's trusted-device cookie does not skip their code", o.data?.otpRequired === true, JSON.stringify(o.data));

    const junk = new Client(app.base, 'junk'); junk.jar.set('lucy_trusted_device', 'a'.repeat(64));
    const j = await junk.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', 'a made-up trusted-device cookie does not skip the code', j.data?.otpRequired === true, JSON.stringify(j.data));

    const forget = await trustedOnly.del('/api/user/trusted-devices');
    const afterForget = new Client(app.base, 'afterforget'); afterForget.jar.set('lucy_trusted_device', trustedOnly.jar.get('lucy_trusted_device'));
    const af = await afterForget.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', 'Forget trusted devices makes the next login ask for a code again', forget.status === 200 && af.data?.otpRequired === true, `${forget.status} ${JSON.stringify(af.data)}`);

    const stud = await prisma.user.create({ data: { id: (await admin.auth.admin.createUser({ email: `${tag}.noemail@lucy.local`, password: PW, email_confirm: true })).data.user.id, email: `${tag}.noemail@lucy.local`, name: `ZZTEST noemail ${tag}`, role: 'STUDENT', schoolId: S.schoolA, verified: true, legalVersionAccepted: '2026-10-31' } });
    created.authIds.push(stud.id); created.userIds.push(stud.id);
    const ps = new Client(app.base, 'placeholder');
    const p = await ps.post('/api/auth/login', { email: stud.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    report.check('emailed code', 'a placeholder @lucy.local account signs in with the password alone', p.status === 200 && ps.jar.has('lucy_device_session'), JSON.stringify(p.data));

    const badPw = await new Client(app.base, 'badpw').post('/api/auth/login', { email: who.email, password: 'wrong-password', turnstileToken: 'e2e' });
    report.check('emailed code', 'a wrong password sends no code and says nothing special', badPw.status === 401, `status ${badPw.status}`);
    const before = mail.count(who.email);
    await new Client(app.base, 'badpw2').post('/api/auth/login', { email: who.email, password: 'wrong-password', turnstileToken: 'e2e' });
    report.check('emailed code', 'a wrong password does not trigger an email (no mail bombing)', mail.count(who.email) === before, '');
}

async function groupRoleMatrix() {
    const roleToKey = { OWNER: 'owner', PRINCIPAL: 'principal', TEACHER: 'teacher', ACCOUNTANT: 'accountant', RECORDER: 'recorder', STUDENT: 'student', PARENT: 'parent', SUPERADMIN: 'superadmin' };
    const files = walk(path.join(ROOT, 'app/api'), (p) => p.endsWith(`${path.sep}route.ts`));
    let tested = 0, breaches = [], errors = [];
    for (const f of files) {
        const url = toUrl(f, 'app'), src = fs.readFileSync(f, 'utf8');
        if (PUBLIC_API.test(url) || !/export (async function|const) GET\b/.test(src)) continue;
        const sets = parseRoleSets(src);
        if (sets.length !== 1) continue;
        const allowed = new Set(sets[0].split(','));
        for (const [role, key] of Object.entries(roleToKey)) {
            const r = await sessions[key].get(fill(url));
            tested++;
            const allowedHere = allowed.has(role) || (role === 'TEACHER' && allowed.has('HOMEROOM'));
            if (!allowedHere && r.status >= 200 && r.status < 300) breaches.push(`${role} GET ${url} -> ${r.status}`);
            if (r.status >= 500 && r.status !== 503) errors.push(`${role} GET ${url} -> ${r.status}`); // 503 is a deliberate pause (Chapa checkout)
        }
    }
    report.check('role matrix', `${tested} role x route GET checks: no role reaches a route its guard excludes`, breaches.length === 0, breaches.join(' | '));
    report.check('role matrix', 'no server errors (5xx) in the role x route checks', errors.length === 0, errors.join(' | '));

    // Admin routes use verifySuperAdmin instead of requireRole.
    const adminRoutes = files.filter((f) => toUrl(f, 'app').startsWith('/api/admin') && /export (async function|const) GET\b/.test(fs.readFileSync(f, 'utf8')));
    const leaks = [];
    for (const f of adminRoutes) {
        for (const key of ['owner', 'principal', 'teacher', 'accountant', 'recorder', 'student', 'parent']) {
            const r = await sessions[key].get(fill(toUrl(f, 'app')));
            if (r.status >= 200 && r.status < 300) leaks.push(`${key} GET ${toUrl(f, 'app')} -> ${r.status}`);
        }
    }
    report.check('role matrix', `${adminRoutes.length} platform-admin GET routes refuse every non-superadmin role`, leaks.length === 0, leaks.join(' | '));
}

async function groupPages() {
    const pages = walk(path.join(ROOT, 'app/dashboard'), (p) => p.endsWith(`${path.sep}page.tsx`)).map((f) => toUrl(f, 'app')).filter((u) => !u.includes('['));
    const keys = ['owner', 'principal', 'teacher', 'accountant', 'recorder', 'student', 'parent'];
    const errs = [];
    const reach = {}; // url -> set of keys that render the page
    for (const url of pages) {
        reach[url] = new Set();
        for (const k of keys) {
            let r;
            try { r = await sessions[k].get(url); } catch (e) { errs.push(`${k} ${url} -> request failed: ${e.cause?.code || e.message}`); continue; }
            const c = classifyPage(r);
            if (r.status >= 500 || /Application error|Internal Server Error/.test(r.text.slice(0, 5000))) errs.push(`${k} ${url} -> ${r.status}`);
            if (c.kind === 'page') reach[url].add(k);
        }
    }
    report.check('pages', `${pages.length} dashboard pages x ${keys.length} roles render or redirect without a server error`, errs.length === 0, errs.join(' | '));

    const mustNot = (url, who) => who.filter((k) => reach[url]?.has(k));
    const expectations = [
        ['/dashboard/finance', ['student', 'recorder']],
        ['/dashboard/payroll', ['student', 'parent', 'recorder']],
        ['/dashboard/revenue', ['teacher', 'student', 'parent', 'recorder']],
        ['/dashboard/operating-costs', ['teacher', 'student', 'parent', 'recorder']],
        ['/dashboard/staff-roles', ['teacher', 'student', 'parent', 'recorder', 'accountant']],
        ['/dashboard/students', ['student', 'parent', 'accountant']],
        ['/dashboard/classes', ['student', 'parent', 'accountant']],
    ];
    const viol = [];
    for (const [url, who] of expectations) { const hit = mustNot(url, who); if (hit.length) viol.push(`${url}: ${hit.join(',')}`); }
    report.check('pages', 'role-restricted pages (finance, payroll, staff roles, student registry) are not rendered for excluded roles', viol.length === 0, viol.join(' | '));
    const table = Object.fromEntries(Object.entries(reach).map(([u, s]) => [u, [...s].join(',')]));
    fs.writeFileSync(path.join(OUT, `e2e-page-access-${tag}.json`), JSON.stringify(table, null, 2));
}

async function groupBusiness() {
    const s = sessions;
    const st = (r) => r.status;

    // Payments: teachers must not settle invoices.
    let r = await s.teacher.post('/api/school/finance/pay/verify', { paymentId: S.payA, status: 'SUCCESS' });
    report.check('payments', 'a teacher cannot confirm a pending payment', st(r) === 403, `status ${st(r)}`);
    r = await s.teacher.post('/api/school/finance/pay', { invoiceId: S.invA, method: 'CASH' });
    report.check('payments', 'a teacher cannot create a payment', st(r) === 403, `status ${st(r)}`);
    r = await s.teacher.get('/api/school/finance/pay/pending');
    report.check('payments', 'a teacher cannot list pending payments', st(r) === 403, `status ${st(r)}`);
    r = await s.teacher.post('/api/school/billing/terminal', { action: 'connection_token' });
    report.check('payments', 'a teacher cannot use the card terminal', st(r) === 403, `status ${st(r)}`);
    r = await s.ownerB.post('/api/school/finance/pay/verify', { paymentId: S.payA, status: 'SUCCESS' });
    report.check('payments', "another school's owner cannot confirm this school's payment", st(r) === 403, `status ${st(r)}`);
    r = await s.accountant.post('/api/school/finance/pay/verify', { paymentId: S.payA, status: 'REFUNDED' });
    report.check('payments', 'a payment status outside SUCCESS/FAILED is rejected', st(r) === 400, `status ${st(r)}`);
    r = await s.parent.post('/api/school/finance/pay', { invoiceId: S.invB, method: 'CASH' });
    report.check('payments', "a parent cannot pay another school's invoice", st(r) === 403, `status ${st(r)}`);
    r = await s.accountant.post('/api/school/finance/pay/verify', { paymentId: S.payA, status: 'SUCCESS' });
    const inv = await prisma.invoice.findUnique({ where: { id: S.invA } });
    report.check('payments', 'the accountant can confirm the payment and the invoice becomes PAID', st(r) === 200 && inv?.status === 'PAID', `status ${st(r)} invoice ${inv?.status}`);

    // Payroll
    const pay = (client, payee) => client.post('/api/director/payroll', { userId: payee, amount: 100, periodStart: '2026-10-01', periodEnd: '2026-10-31' });
    r = await pay(s.accountant, U.teacher.id);
    report.check('payroll', 'an accountant can pay staff of their own school', st(r) === 200, `status ${st(r)}`);
    r = await pay(s.owner, U.teacher.id);
    report.check('payroll', 'an owner can pay staff (was blocked before the fix)', st(r) === 200, `status ${st(r)}`);
    r = await pay(s.accountant, U.teacherB.id);
    report.check('payroll', "payroll for another school's staff is refused", st(r) === 404, `status ${st(r)}`);
    r = await pay(s.teacher, U.teacher.id);
    report.check('payroll', 'a teacher cannot create payroll', st(r) === 403, `status ${st(r)}`);
    r = await s.accountant.post('/api/director/payroll', { userId: U.teacher.id, amount: -5, periodStart: '2026-10-01', periodEnd: '2026-10-31' });
    report.check('payroll', 'a negative payroll amount is rejected', st(r) === 400, `status ${st(r)}`);
    r = await s.accountant.get('/api/director/payroll');
    report.check('payroll', 'payroll list does not expose password hashes or session ids', st(r) === 200 && !/passwordHash|activeSessionId|preferences/.test(r.text), `status ${st(r)}`);

    // Student data
    r = await s.recorder.get(`/api/school/students/${S.a1}/notes`);
    report.check('student data', 'a recorder cannot read confidential student notes', st(r) === 403, `status ${st(r)}`);
    r = await s.recorder.get(`/api/school/students/${S.a1}/ai-analysis`);
    report.check('student data', 'a recorder cannot run the AI analysis (which reads internal notes)', st(r) === 403, `status ${st(r)}`);
    r = await s.recorder.get('/api/school/finance/invoices');
    report.check('student data', 'a recorder cannot see invoices', st(r) === 403, `status ${st(r)}`);
    r = await s.recorder.del('/api/school/students', { json: { id: S.a2 } });
    report.check('student data', 'a recorder cannot delete a student', st(r) === 403, `status ${st(r)}`);
    r = await s.teacher.get(`/api/school/students/${S.a1}/notes`);
    report.check('student data', 'the homeroom teacher can read notes', st(r) === 200, `status ${st(r)}`);
    const t2 = new Client(app.base, 't2'); await signIn(t2, U.teacher2);
    r = await t2.get(`/api/school/students/${S.a1}/notes`);
    report.check('student data', 'a teacher who is not the homeroom teacher cannot read notes', st(r) === 403, `status ${st(r)}`);
    r = await s.teacherB.get(`/api/school/students/${S.a1}/notes`);
    report.check('student data', "another school's teacher cannot read notes", st(r) === 403, `status ${st(r)}`);

    const hasNotes = (res) => (res.data?.internalNotes || []).length > 0;
    r = await s.teacher.get(`/api/school/students/${S.a1}/report-card`);
    report.check('student data', 'report card shows internal notes to the homeroom teacher', st(r) === 200 && hasNotes(r), `status ${st(r)}`);
    r = await t2.get(`/api/school/students/${S.a1}/report-card`);
    report.check('student data', 'report card hides internal notes from other teachers', st(r) === 200 && !hasNotes(r), `status ${st(r)} notes ${r.data?.internalNotes?.length}`);
    r = await s.recorder.get(`/api/school/students/${S.a1}/report-card`);
    report.check('student data', 'report card hides internal notes from the recorder', !hasNotes(r), `status ${st(r)}`);
    r = await s.parent.get(`/api/school/students/${S.a1}/report-card`);
    report.check('student data', "a parent sees their own child's report card without internal notes", st(r) === 200 && !hasNotes(r), `status ${st(r)}`);
    r = await s.parent.get(`/api/school/students/${S.a2}/report-card`);
    report.check('student data', "a parent cannot open another child's report card", [403, 404].includes(st(r)) && !/Atest|Btest|Ctest/.test(r.text), `status ${st(r)}`);
    r = await s.student.get(`/api/school/students/${S.a2}/report-card`);
    report.check('student data', "a student cannot open a classmate's report card", [403, 404].includes(st(r)) && !/Atest|Btest|Ctest/.test(r.text), `status ${st(r)}`);
    r = await s.teacherB.get(`/api/school/students/${S.a1}/report-card`);
    report.check('student data', "another school's teacher cannot open the report card", [403, 404].includes(st(r)) && !/Atest|Btest|Ctest/.test(r.text), `status ${st(r)}`);
    r = await s.principal.get(`/api/school/students/${S.b1}/report-card`);
    report.check('student data', "a principal cannot open another school's student", [403, 404].includes(st(r)) && !/Atest|Btest|Ctest/.test(r.text), `status ${st(r)}`);

    // Absence notes and school billing receipts are not visible to everyone in the school.
    r = await s.teacher.get('/api/school/authorizations');
    report.check('privacy', 'teaching staff see the whole school\'s absence notes', st(r) === 200 && r.text.includes(S.a3Code), `status ${st(r)}`);
    for (const k of ['parent', 'student']) {
        r = await s[k].get('/api/school/authorizations');
        report.check('privacy', `a ${k} does not see other families' absence notes or student codes`, st(r) === 200 && !r.text.includes(S.a3Code) && !r.text.includes('ZZTEST private reason'), `status ${st(r)}`);
    }
    for (const k of ['accountant', 'recorder']) {
        r = await s[k].get('/api/school/authorizations');
        report.check('privacy', `a ${k} cannot list absence notes`, st(r) === 403, `status ${st(r)}`);
    }
    for (const k of ['teacher', 'accountant', 'recorder', 'student', 'parent']) {
        r = await s[k].get('/api/school/billing/receipt');
        report.check('privacy', `a ${k} cannot list the school's LUCY subscription receipts`, st(r) === 403, `status ${st(r)}`);
    }
    r = await s.owner.get('/api/school/billing/receipt');
    report.check('privacy', 'the owner can list subscription receipts', st(r) === 200, `status ${st(r)}`);
    for (const k of ['owner', 'principal']) {
        r = await s[k].get('/api/admin/security/audit-logs');
        report.check('privacy', `a school ${k} cannot read the platform-wide sign-in log`, st(r) === 403, `status ${st(r)}`);
    }
    r = await s.superadmin.get('/api/admin/security/audit-logs');
    report.check('privacy', 'the platform superadmin can read the sign-in log', st(r) === 200, `status ${st(r)}`);

    // Student codes need the date of birth.
    r = await s.parent.post('/api/parent/link-student', { studentCode: S.a2Code, confirm: false });
    report.check('student codes', 'linking by code without a date of birth is refused', st(r) === 400, `status ${st(r)}`);
    r = await s.parent.post('/api/parent/link-student', { studentCode: S.a2Code, dob: '2011-01-01', confirm: false });
    report.check('student codes', 'a wrong date of birth is refused with the generic error', st(r) === 404 && /does not match/.test(r.text), `status ${st(r)}`);
    r = await s.parent.post('/api/parent/link-student', { studentCode: 'ST-NOSUCH00-2026', dob: '2012-03-04', confirm: false });
    report.check('student codes', 'an unknown code gives the same error as a wrong date of birth', st(r) === 404 && /does not match/.test(r.text), `status ${st(r)}`);
    r = await s.parent.post('/api/parent/pair', { studentCode: S.a2Code });
    report.check('student codes', 'the pair route also needs the date of birth', st(r) === 404, `status ${st(r)}`);
    const anon = new Client(app.base, 'anon2');
    r = await anon.post('/api/auth/verify-code', { code: S.a2Code });
    report.check('student codes', 'the public code check reveals nothing without the date of birth', st(r) === 404 && !/Zoe|Btest/.test(r.text), `status ${st(r)}`);
    r = await anon.post('/api/auth/verify-code', { code: S.a2Code, dob: '2012-03-04' });
    report.check('student codes', 'with code and date of birth the public check returns a first name and initial only', st(r) === 200 && /Zoe/.test(r.text) && !/Btest/.test(r.text), `status ${st(r)}`);
    r = await anon.post('/api/auth/register/student', { studentCode: S.a2Code, password: PW, email: email('nosignup'), acceptedTerms: true });
    report.check('student codes', 'student registration without a date of birth is refused (before any account is created)', st(r) === 404, `status ${st(r)}`);
    r = await s.parent.post('/api/parent/link-student', { studentCode: S.a2Code, dob: '2012-03-04', confirm: true });
    const linked = await prisma.parentStudentLink.findFirst({ where: { parentId: U.parent.id, studentId: S.a2 } });
    report.check('student codes', 'code plus the right date of birth links the child', st(r) === 200 && Boolean(linked), `status ${st(r)}`);

    // Staff invitations
    r = await s.owner.post('/api/school/staff-roles', { email: email('invitee'), role: 'ACCOUNTANT' });
    report.check('staff roles', 'an owner can invite an accountant (mail captured, not sent)', st(r) === 200 && r.data?.inviteToken && mail.count(email('invitee')) >= 1, `status ${st(r)}`);
    S.inviteToken = r.data?.inviteToken;
    for (const k of ['teacher', 'recorder', 'accountant', 'student', 'parent']) {
        r = await s[k].post('/api/school/staff-roles', { email: email('x' + k), role: 'RECORDER' });
        report.check('staff roles', `a ${k} cannot invite staff`, st(r) === 403, `status ${st(r)}`);
    }
    r = await s.owner.post('/api/school/staff-roles', { email: email('badrole'), role: 'SUPERADMIN' });
    report.check('staff roles', 'inviting a SUPERADMIN through the staff route is refused', st(r) === 400, `status ${st(r)}`);
    r = await s.owner.post('/api/school/staff-roles', { email: email('badrole2'), role: 'OWNER' });
    report.check('staff roles', 'inviting an OWNER through the staff route is refused', st(r) === 400, `status ${st(r)}`);
    const row = await prisma.inviteToken.findFirst({ where: { token: S.inviteToken } });
    r = await s.ownerB.del(`/api/school/staff-roles?inviteId=${row?.id}`);
    report.check('staff roles', "another school's owner cannot revoke this school's invitation", st(r) === 404, `status ${st(r)}`);
    r = await new Client(app.base, 'visitor').get(`/invite/${S.inviteToken}`);
    report.check('staff roles', 'the invitation page opens for the invited person', st(r) === 200, `status ${st(r)}`);
    r = await new Client(app.base, 'visitor2').post('/api/dir/register', { token: S.inviteToken, userId: crypto.randomUUID(), name: 'Mallory', acceptedTerms: true });
    report.check('staff roles', 'an invitation cannot be redeemed by an identity that is not the invited email', st(r) === 400, `status ${st(r)}`);

    // Files
    const f = (client, p) => client.get(`/api/files/${p}`);
    r = await f(s.student, `school-assets/${S.schoolA}/receipts/1-ab.png`);
    report.check('files', 'a student cannot open payment receipts', st(r) === 403, `status ${st(r)}`);
    r = await f(s.accountant, `school-assets/${S.schoolA}/receipts/1-ab.png`);
    report.check('files', 'an accountant passes the receipt access check (object itself missing)', st(r) === 404, `status ${st(r)}`);
    r = await f(s.student, `books/${S.schoolA}/student-submissions/${ZERO}/1-ab.pdf`);
    report.check('files', "a student cannot open another student's coursework", st(r) === 403, `status ${st(r)}`);
    r = await f(s.teacherB, `school-assets/${S.schoolA}/avatars/1-ab.jpg`);
    report.check('files', "another school's teacher cannot open this school's files", st(r) === 403, `status ${st(r)}`);
    r = await f(s.teacher, `school-assets/${S.schoolA}/../${S.schoolB}/avatars/1-ab.jpg`);
    report.check('files', 'path traversal in a file path is refused', [403, 404].includes(st(r)), `status ${st(r)}`);
    r = await f(s.teacher, `other-bucket/${S.schoolA}/avatars/1-ab.jpg`);
    report.check('files', 'an unknown storage bucket is refused', st(r) === 403, `status ${st(r)}`);
}

async function groupHardening() {
    const anon = new Client(app.base, 'h');
    let r = await anon.get('/login');
    const h = r.headers;
    report.check('hardening', 'security headers present on pages (CSP, frame, nosniff)', /frame-ancestors 'none'/.test(h.get('content-security-policy') || '') && h.get('x-frame-options') === 'DENY' && h.get('x-content-type-options') === 'nosniff', '');
    report.check('hardening', 'responses are not cacheable by shared caches', /no-store/.test(h.get('cache-control') || ''), h.get('cache-control') || '');

    r = await anon.get('/api/auth/test-db'); report.check('hardening', 'test-db endpoint refuses in production', r.status === 403, `status ${r.status}`);
    r = await anon.post('/api/debug-ingest', {}); report.check('hardening', 'debug-ingest endpoint refuses in production', r.status === 403, `status ${r.status}`);
    for (const p of ['/api/cron/backups', '/api/cron/prune-logs', '/api/cron/billing-reminders']) {
        const a = await anon.get(p); const b = await anon.get(p, { headers: { authorization: 'Bearer wrong' } });
        report.check('hardening', `cron ${p} refuses no secret and a wrong secret`, a.status === 401 && b.status === 401, `${a.status}/${b.status}`);
    }
    for (const p of ['/api/webhooks/chapa', '/api/webhooks/stripe']) {
        const w = await anon.post(p, { event: 'charge.success' });
        // 500 here means the signing secret is not configured (the handler fails closed); it is never a success.
        report.check('hardening', `webhook ${p} refuses an unsigned event`, w.status >= 400, `status ${w.status}${w.status === 500 ? ' (secret not configured in this environment)' : ''}`);
    }

    // CSRF and size
    const t = sessions.teacher;
    r = await t.post('/api/user/preferences', { immersiveVisuals: true }, { headers: { origin: 'https://evil.example' } });
    report.check('hardening', 'a cross-site Origin is refused on a mutating request', r.status === 403, `status ${r.status}`);
    r = await t.req('POST', '/api/user/preferences', { body: 'x'.repeat(1_200_000), headers: { 'content-type': 'application/json' } });
    report.check('hardening', 'an oversized request body is refused', r.status === 413, `status ${r.status}`);
    r = await t.post('/api/user/preferences', { fullAccess: true, immersiveVisuals: true });
    const row = await prisma.user.findUnique({ where: { id: U.teacher.id }, select: { preferences: true } });
    report.check('hardening', 'a user cannot set the server-owned fullAccess preference', !(row?.preferences && row.preferences.fullAccess === true), JSON.stringify(row?.preferences));

    // Open redirect
    r = await anon.get('/auth/callback?next=//evil.example/x'); report.check('hardening', 'callback with an off-site next stays on this site', !/evil\.example/.test(r.location || ''), r.location);
    r = await anon.get('/auth/callback?code=bogus&next=https://evil.example'); report.check('hardening', 'callback with a bad code and off-site next stays on this site', !/evil\.example/.test(r.location || ''), r.location);

    // Injection probes
    for (const p of [`/api/school/students/%27%20OR%201%3D1--/report-card`, `/api/files/school-assets/%27%3Bdrop%20table`, `/api/school/students?search=%27%20OR%20%271%27%3D%271`]) {
        const x = await t.get(p);
        report.check('hardening', `injection probe ${decodeURIComponent(p).slice(0, 50)} is harmless (no 200 with data, no 5xx)`, x.status < 500 && !(x.status === 200 && /students"?:\s*\[\{/.test(x.text)), `status ${x.status}`);
    }

    // Rate limit and spoofed headers (production behaviour)
    const rl = new Client(app.base, 'rl', '198.51.100.201');
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push((await rl.post('/api/auth/verify-code', { code: 'ST-NOPE0000-2026', dob: '2012-03-04' })).status);
    report.check('rate limit', 'the student-code check is limited to 5 per minute per address', codes.slice(5).every((c) => c === 429) && codes.slice(0, 5).every((c) => c === 404), codes.join(','));
    const spoof = [];
    for (let i = 0; i < 8; i++) spoof.push((await rl.post('/api/auth/verify-code', { code: 'ST-NOPE0000-2026', dob: '2012-03-04' }, { headers: { 'x-real-ip': '127.0.0.1', 'x-forwarded-for': `203.0.113.${i}` } })).status);
    report.check('rate limit', 'spoofed x-real-ip / x-forwarded-for / localhost headers do not reset or bypass the limit', spoof.every((c) => c === 429), spoof.join(','));
    const lo = new Client(app.base, 'lo', '127.0.0.1');
    const loc = [];
    for (let i = 0; i < 8; i++) loc.push((await lo.post('/api/auth/verify-code', { code: 'ST-NOPE0000-2026', dob: '2012-03-04' })).status);
    report.check('rate limit', 'claiming to be 127.0.0.1 gives no exemption in production', loc.slice(5).every((c) => c === 429), loc.join(','));
}

// ------------------------------------------------------------------ cleanup
async function cleanup() {
    const notes = [];
    try {
        // Let the platform's own purge delete each school (also exercises that route), as the test superadmin.
        const sa = sessions.superadmin;
        for (const id of created.schoolIds) {
            const r = sa ? await sa.del(`/api/admin/schools/${id}`) : { status: 0 };
            notes.push(`purge school ${id.slice(0, 8)} -> ${r.status}`);
        }
        report.check('cleanup', 'platform purge of both test schools succeeded', created.schoolIds.length > 0 && notes.every((n) => /-> 200$/.test(n)), notes.join('; '));
    } catch (e) { notes.push('purge error ' + e.message); }

    await prisma.$executeRawUnsafe(`DELETE FROM auth_audit_logs WHERE email LIKE '%${tag}%'`).catch(() => {});
    await deleteUsersEverywhere(prisma, created.userIds);
    // Users the app itself created from hostile input (placeholders for invited staff, for example).
    const strays = await prisma.user.findMany({ where: { OR: [{ email: { contains: tag } }, { name: { contains: tag } }] }, select: { id: true } });
    await deleteUsersEverywhere(prisma, strays.map((u) => u.id));
    for (const id of created.authIds) await admin.auth.admin.deleteUser(id).catch(() => {});
    const removeTree = async (bucket, prefix) => {
        const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 }).catch(() => ({ data: [] }));
        for (const item of data || []) {
            const full = `${prefix}/${item.name}`;
            if (item.id) await admin.storage.from(bucket).remove([full]).catch(() => {});
            else await removeTree(bucket, full);
        }
    };
    for (const id of created.schoolIds) {
        await removeTree('school-backups', `purged-schools/${id}`);
        for (const bucket of ['school-backups', 'school-assets', 'books']) await removeTree(bucket, id);
    }

    const left = {
        users: await prisma.user.count({ where: { email: { contains: tag } } }),
        schools: await prisma.school.count({ where: { name: { contains: tag } } }),
        students: await prisma.student.count({ where: { school: { name: { contains: tag } } } }),
        invites: await prisma.inviteToken.count({ where: { email: { contains: tag } } }),
    };
    const { data: authLeft } = await admin.auth.admin.listUsers({ perPage: 1000 });
    left.authUsers = (authLeft?.users || []).filter((u) => (u.email || '').includes(tag)).length;
    report.check('cleanup', 'no test data is left behind', Object.values(left).every((n) => n === 0), JSON.stringify(left));
}

// ------------------------------------------------------------------ main
async function main() {
    console.log(`E2E tag ${tag}`);
    app = await startApp({
        port: PORT, logFile: path.join(OUT, `e2e-server-${tag}.log`),
        env: {
            RESEND_API_KEY: 're_test_local', RESEND_BASE_URL: `http://127.0.0.1:${MAIL_PORT}`, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
            UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', KV_REST_API_URL: '', KV_REST_API_TOKEN: '',
            NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`, LOGIN_OTP_REQUIRED: '', CRON_SECRET: 'e2e-cron-secret-not-real',
            GEMINI_API_KEY: 'e2e-dummy-key', GOOGLE_GENERATIVE_AI_API_KEY: 'e2e-dummy-key', STRIPE_SECRET_KEY: 'sk_test_e2e_dummy_key_not_real', CHAPA_SECRET_KEY: 'CHASECK_TEST-e2e-dummy', GMAIL_USER: '', GMAIL_APP_PASSWORD: '',
        },
    });
    try {
        await seed(); console.log(`[e2e] Seeded test schools and users (tag: ${tag})`);
        report.check('setup', `seeded 2 schools and ${Object.keys(U).length} users (tag ${tag})`, true);
        await groupPublicSurface(); console.log('[e2e] Group public surface complete');
        await loginAll(); console.log('[e2e] Group login all complete');
        await groupGateBypass(); console.log('[e2e] Group gate bypass complete');
        await groupOtp(); console.log('[e2e] Group OTP complete');
        await groupRoleMatrix(); console.log('[e2e] Group role matrix complete');
        await groupPages(); console.log('[e2e] Group pages complete');
        await groupBusiness(); console.log('[e2e] Group business complete');
        await groupHardening(); console.log('[e2e] Group hardening complete');

        const ctx = { report, sessions, app, S, U, prisma, admin, mail, PW, tag, ROOT, OUT, walk, toUrl, fill, parseRoleSets, PUBLIC_API, signIn, goTrueClient };
        await groupSizes(ctx); console.log('[e2e] Group sizes complete');
        await groupTokens(ctx); console.log('[e2e] Group tokens complete');
        await groupUploads(ctx); console.log('[e2e] Group uploads complete');
        await groupRaces(ctx); console.log('[e2e] Group races complete');
        await groupFuzz(ctx); console.log('[e2e] Group fuzz complete');
        if (process.env.E2E_UI !== 'off') { await groupUi(ctx); console.log('[e2e] Group UI crawl complete'); }
    } catch (e) {
        report.check('run', 'run completed without an unexpected error', false, e.stack || e.message);
    } finally {
        try { await cleanup(); } catch (e) { report.check('cleanup', 'cleanup ran', false, e.message); }
        app?.child.kill();
        mail.close();
        await prisma.$disconnect();
        await pool.end().catch(() => {});
    }
    const { total, failed, groups } = report.summary();
    fs.writeFileSync(path.join(OUT, `e2e-report-${tag}.json`), JSON.stringify({ tag, total, groups, rows: report.rows }, null, 2));
    console.log('\nGroup results:'); for (const [g, v] of Object.entries(groups)) console.log(`  ${g}: ${v.pass} passed, ${v.fail} failed`);
    console.log(`\n${total - failed.length}/${total} checks passed`);
    for (const f of failed) console.log(`FAIL [${f.group}] ${f.name}\n     ${f.detail}`);
    process.exit(failed.length ? 1 : 0);
}
main();
