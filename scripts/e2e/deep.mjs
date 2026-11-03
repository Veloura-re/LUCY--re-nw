// Deep penetration groups for the live end-to-end run: payload fuzzing of every state-changing route
// with a tenant-integrity oracle, concurrency races, token tampering, hostile uploads and list-size abuse.
// Called from run.mjs with the shared context (app, seeded ids, sessions, report, helpers).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from './lib.mjs';

const SECRET_LEAK = /passwordHash|activeSessionId|SERVICE_ROLE|service_role|sk_live|sk_test|whsec_|OTP_HMAC|CRON_SECRET|PrismaClient|prisma\.\w+\.\w+\(|invocation|relation "|violates|at .+\(.+:\d+:\d+\)|node_modules/;

const rotateIp = () => `198.51.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

// ---- tenant integrity oracle ---------------------------------------------------
async function snapshot(ctx) {
    const { prisma, S } = ctx;
    const b = { schoolId: S.schoolB };
    const tables = {
        school: await prisma.school.findUnique({ where: { id: S.schoolB } }),
        users: await prisma.user.findMany({ where: b, orderBy: { id: 'asc' }, select: { id: true, role: true, schoolId: true, name: true, email: true, verified: true, preferences: true, phone: true, bio: true } }),
        students: await prisma.student.findMany({ where: b, orderBy: { id: 'asc' } }),
        classes: await prisma.class.findMany({ where: { OR: [b, { grade: b }] }, orderBy: { id: 'asc' } }),
        grades: await prisma.grade.findMany({ where: b, orderBy: { id: 'asc' } }),
        invoices: await prisma.invoice.findMany({ where: b, orderBy: { id: 'asc' } }),
        payments: await prisma.payment.findMany({ where: { invoice: b }, orderBy: { id: 'asc' } }),
        notes: await prisma.internalNote.findMany({ where: { student: b }, orderBy: { id: 'asc' } }),
        absences: await prisma.absenceAuthorization.findMany({ where: { OR: [{ student: b }, { requestor: b }] }, orderBy: { id: 'asc' } }),
        invites: await prisma.inviteToken.findMany({ where: b, orderBy: { id: 'asc' } }),
        events: await prisma.event.findMany({ where: b }).catch(() => []),
        books: await prisma.book.findMany({ where: b }).catch(() => []),
        rooms: await prisma.chatRoom.findMany({ where: b }).catch(() => []),
        terms: await prisma.academicTerm.findMany({ where: b }).catch(() => []),
        payroll: await prisma.staffPayroll.findMany({ where: { user: b } }).catch(() => []),
        expenses: await prisma.institutionalExpense.findMany({ where: b }).catch(() => []),
    };
    const out = {};
    for (const [k, v] of Object.entries(tables)) out[k] = crypto.createHash('sha1').update(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? String(x) : x))).digest('hex');
    return out;
}
const diff = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]);

// ---- fuzz inventory --------------------------------------------------------------
function handlerBody(src, method) {
    const m = src.search(new RegExp(`export (async function|const) ${method}\\b`));
    if (m < 0) return null;
    const rest = src.slice(m + 12);
    const next = rest.search(/\n(?:export )?(?:async )?function \w+|\nexport (?:const|async function) \w+/);
    const body = next < 0 ? rest : rest.slice(0, next);
    const wrapped = body.match(/withAudit\((\w+)/);
    if (wrapped) {
        const inner = src.search(new RegExp(`(async )?function ${wrapped[1]}\\b`));
        if (inner >= 0) {
            const r2 = src.slice(inner + 10);
            const n2 = r2.search(/\n(?:export )?(?:async )?function \w+|\nexport (?:const|async function) \w+/);
            return n2 < 0 ? r2 : r2.slice(0, n2);
        }
    }
    return body;
}

function payloads(S, U) {
    const B = { id: S.b1, studentId: S.b1, invoiceId: S.invB, paymentId: S.payB, schoolId: S.schoolB, classId: S.classB, userId: U.teacherB.id, parentId: U.teacherB.id, requestId: ZERO, email: U.teacherB.email };
    return [
        {},
        { ...B },
        { ...B, role: 'SUPERADMIN', verified: true, fullAccess: true, isAdmin: true, preferences: { fullAccess: true }, status: 'PAID', amount: -1, password: 'x' },
        { id: { not: null }, studentId: { contains: '' }, schoolId: { not: S.schoolA }, email: { contains: '' }, userId: { in: [U.teacherB.id] } },
        JSON.parse(`{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"id":"${S.b1}"}`),
        { id: 'x'.repeat(100_000), name: 'y'.repeat(200_000) },
        { id: [S.b1], studentId: [S.b1], schoolId: [S.schoolB], amount: 'NaN', page: -1, limit: 1e12 },
        { name: '<img src=x onerror=window.__xss=1>', content: "' OR 1=1--", note: '..\\..\\etc\\passwd', email: 'a@b.co\r\nBcc: x@y.zz', title: '${7*7}{{7*7}}' },
    ];
}
const ZERO = '00000000-0000-0000-0000-000000000000';

export async function groupFuzz(ctx) {
    const { report, sessions, S, U, app, walk, toUrl, ROOT, parseRoleSets, PUBLIC_API, prisma } = ctx;
    // Extra records in the victim school so integrity checks have more to protect.
    const payB = await prisma.payment.create({ data: { invoiceId: S.invB, amount: 500, method: 'CASH', status: 'PENDING' } });
    S.payB = payB.id;

    const files = walk(path.join(ROOT, 'app/api'), (p) => p.endsWith(`${path.sep}route.ts`));
    const targets = [];
    for (const f of files) {
        const url = toUrl(f, 'app');
        if (PUBLIC_API.test(url) || /^\/api\/(admin|ai|school\/upload|school\/books\/upload|student\/assignments\/upload|messages\/upload)/.test(url)) continue;
        const src = fs.readFileSync(f, 'utf8');
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
            const body = handlerBody(src, method);
            if (!body) continue;
            const sets = parseRoleSets(`export async function GET() {${body}`);
            targets.push({ url, method, allowed: sets.length === 1 ? new Set(sets[0].split(',')) : null });
        }
    }
    report.note('fuzz', 'inventory', `${targets.length} state-changing handlers (${targets.filter((t) => t.allowed).length} with a single parsed role set)`);

    const fillB = (url) => url
        .replace(/\[\.\.\.(\w+)\]/g, 'x/y')
        .replace(/\[(\w+)\]/g, (_m, n) => ({ studentId: S.b1, invoiceId: S.invB, paymentId: S.payB, roomId: ZERO }[n] || (/student/.test(url) ? S.b1 : /invoice/.test(url) ? S.invB : ZERO)));

    const attackers = ['owner', 'principal', 'teacher', 'accountant', 'recorder', 'student', 'parent'];
    const roleOf = { owner: 'OWNER', principal: 'PRINCIPAL', teacher: 'TEACHER', accountant: 'ACCOUNTANT', recorder: 'RECORDER', student: 'STUDENT', parent: 'PARENT' };
    const breaches = [], leaks = [], fiveHundreds = new Map(), integrity = [], privilege = [];
    const schoolAUsers = Object.values(U).filter((u) => u.role !== 'SUPERADMIN' && !/B$/.test(Object.keys(U).find((k) => U[k] === u)));
    const baseline = Object.fromEntries((await prisma.user.findMany({ where: { id: { in: schoolAUsers.map((u) => u.id) } }, select: { id: true, role: true, schoolId: true } })).map((u) => [u.id, u]));
    let sent = 0;

    for (const who of attackers) {
        const before = await snapshot(ctx);
        const c = sessions[who];
        for (const t of targets) {
            for (const [i, payload] of payloads(S, U).entries()) {
                if (i === 5 && !['owner', 'student'].includes(who)) continue; // the 300 KB payload once per kind of caller is enough
                c.ip = rotateIp();
                let r;
                try {
                    r = t.method === 'DELETE'
                        ? await c.req('DELETE', `${fillB(t.url)}?id=${S.b1}&studentId=${S.b1}&inviteId=${ZERO}`, { json: payload })
                        : await c.req(t.method, fillB(t.url), { json: payload });
                } catch (e) { continue; }
                sent++;
                if (r.status >= 200 && r.status < 300) {
                    // Pinpoint any request that moves or demotes a school A user, then restore them.
                    const now = await prisma.user.findMany({ where: { id: { in: schoolAUsers.map((u) => u.id) } }, select: { id: true, role: true, schoolId: true } });
                    for (const u of now) {
                        const b = baseline[u.id];
                        if (b && (u.role !== b.role || u.schoolId !== b.schoolId)) {
                            privilege.push(`${who} ${t.method} ${t.url} (payload ${i}) changed a user: ${b.role}/${b.schoolId ? 'school' : 'none'} -> ${u.role}/${u.schoolId ? 'school' : 'none'}`);
                            await prisma.user.update({ where: { id: u.id }, data: { role: b.role, schoolId: b.schoolId } });
                        }
                    }
                }
                if (t.allowed && !t.allowed.has(roleOf[who]) && r.status >= 200 && r.status < 300) breaches.push(`${who} ${t.method} ${t.url} (payload ${i}) -> ${r.status}`);
                if (SECRET_LEAK.test(r.text.slice(0, 4000))) leaks.push(`${who} ${t.method} ${t.url} (payload ${i}) -> ${r.status} ${r.text.slice(0, 80).replace(/\s+/g, ' ')}`);
                if (r.status >= 500 && r.status !== 503) { const k = `${t.method} ${t.url}`; fiveHundreds.set(k, (fiveHundreds.get(k) || 0) + 1); }
            }
        }
        const after = await snapshot(ctx);
        const changed = diff(before, after);
        if (changed.length) integrity.push(`${who} changed school B: ${changed.join(',')}`);
        const me = await prisma.user.findUnique({ where: { id: U[who].id }, select: { role: true, schoolId: true } });
        if (me.role !== roleOf[who] || me.schoolId !== S.schoolA) privilege.push(`${who} is now ${me.role} in ${me.schoolId}`);
    }
    report.note('fuzz', 'volume', `${sent} hostile requests sent`);
    report.check('fuzz', 'no role changes another school\'s data with cross-tenant ids, mass assignment or operator payloads', integrity.length === 0, integrity.join(' | '));
    report.check('fuzz', 'no attacker gained a role or moved to another school', privilege.length === 0, privilege.join(' | '));
    report.check('fuzz', 'no role succeeds on a state-changing route its guard excludes', breaches.length === 0, breaches.slice(0, 15).join(' | '));
    report.check('fuzz', 'no response leaks secrets, stack traces or database internals', leaks.length === 0, leaks.slice(0, 10).join(' | '));
    report.check('fuzz', 'hostile payloads never crash a handler (no 5xx)', fiveHundreds.size === 0, [...fiveHundreds].slice(0, 25).map(([k, n]) => `${k} x${n}`).join(' | '));
}

// ---- concurrency races -------------------------------------------------------------
export async function groupRaces(ctx) {
    const { report, sessions, S, U, app, prisma, signIn, mail, PW } = ctx;
    const many = (n, fn) => Promise.all(Array.from({ length: n }, fn));

    // Confirming one payment many times at once must settle it exactly once.
    const inv = await prisma.invoice.create({ data: { studentId: S.a2, schoolId: S.schoolA, amount: 700, dueDate: new Date(Date.now() + 864e5) } });
    const pay = await prisma.payment.create({ data: { invoiceId: inv.id, amount: 700, method: 'CASH', status: 'PENDING' } });
    const res = await many(12, () => sessions.accountant.post('/api/school/finance/pay/verify', { paymentId: pay.id, status: 'SUCCESS' }));
    const ok = res.filter((r) => r.status === 200).length;
    const audits = await prisma.auditLog.count({ where: { resourceId: pay.id, action: 'PAYMENT_VERIFIED' } });
    report.check('races', '12 simultaneous confirmations settle a payment exactly once', ok === 1 && audits === 1, `${ok} accepted, ${audits} audit rows`);

    // The same emailed code used by many requests at once: one success only.
    const who = U.teacher2;
    const c = new Client(app.base, 'race-otp');
    const since = Date.now() - 50;
    await c.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    let code = null;
    for (let i = 0; i < 20 && !code; i++) { code = mail.latestCode(who.email, since); if (!code) await new Promise((r) => setTimeout(r, 150)); }
    const vs = await many(12, () => c.post('/api/auth/verify-otp', { code }));
    report.check('races', 'one emailed code used 12 times at once succeeds once', vs.filter((r) => r.status === 200).length === 1, vs.map((r) => r.status).join(','));

    // Guessing in parallel must still stop at five attempts.
    const c2 = new Client(app.base, 'race-guess');
    const since2 = Date.now() - 50;
    await c2.post('/api/auth/login', { email: who.email, password: PW, turnstileToken: 'e2e', acceptedTerms: true });
    let code2 = null;
    for (let i = 0; i < 20 && !code2; i++) { code2 = mail.latestCode(who.email, since2); if (!code2) await new Promise((r) => setTimeout(r, 150)); }
    const wrong = code2 === '000000' ? '111111' : '000000';
    const fl = await many(30, () => c2.post('/api/auth/verify-otp', { code: wrong }));
    const seen400 = fl.filter((r) => r.status === 400).length;
    const after = await c2.post('/api/auth/verify-otp', { code: code2 });
    report.check('races', '30 parallel wrong guesses are cut off at five and then lock the real code out', seen400 <= 5 && after.status === 429, `${seen400} counted wrong, real code -> ${after.status}`);

    // Linking the same child many times at once creates one link.
    const parent = sessions.parent;
    await many(10, () => parent.post('/api/parent/link-student', { studentCode: S.a3Code, dob: '2012-03-04', confirm: true }));
    const links = await prisma.parentStudentLink.count({ where: { parentId: U.parent.id, student: { studentCode: S.a3Code } } });
    report.check('races', '10 simultaneous link requests create a single parent-child link', links === 1, `${links} links`);

    // Inviting the same address many times at once leaves one live invitation.
    const addr = `${ctx.tag}.race@lucy-e2e.example`;
    await many(8, () => sessions.owner.post('/api/school/staff-roles', { email: addr, role: 'RECORDER' }));
    const live = await prisma.inviteToken.count({ where: { email: addr, usedAt: null } });
    report.check('races', '8 simultaneous invitations to one address leave one live invitation', live === 1, `${live} live`);
}

// ---- token tampering and session rules ---------------------------------------------
export async function groupTokens(ctx) {
    const { report, app, U, PW, signIn, goTrueClient } = ctx;
    const { client: gt } = await goTrueClient(U.teacher);
    const cookieNames = [...gt.jar.keys()].filter((k) => k.startsWith('sb-'));
    const decode = (v) => JSON.parse(Buffer.from(v.replace(/^base64-/, ''), 'base64url').toString());
    const joined = cookieNames.sort().map((k) => gt.jar.get(k)).join('');
    let session;
    try { session = decode(joined); } catch { session = null; }
    if (!session) { report.note('tokens', 'JWT tamper', 'could not decode the session cookie format; skipped'); return; }

    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const [h, p, s] = session.access_token.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    const forged = [
        ['role claim set to service_role', `${h}.${b64({ ...payload, role: 'service_role' })}.${s}`],
        ['subject swapped to the owner', `${h}.${b64({ ...payload, sub: U.owner.id })}.${s}`],
        ['alg none', `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...payload, sub: U.owner.id, role: 'authenticated' })}.`],
        ['signature stripped', `${h}.${p}.`],
    ];
    // A real full sign-in first, so only the token is wrong and everything else (device cookies) is valid.
    const real = new Client(app.base, 'tamper');
    await signIn(real, U.teacher);
    ctx.sessions.teacher = real; // the newest sign-in owns the account, so keep the shared session valid
    for (const [label, token] of forged) {
        const t = new Client(app.base, 'forged-token');
        real.jar.forEach((v, k) => { if (!k.startsWith('sb-')) t.jar.set(k, v); });
        const tampered = b64({ ...session, access_token: token });
        t.jar.set(cookieNames[0].replace(/\.\d+$/, ''), 'base64-' + tampered);
        const r = await t.get('/api/user/settings');
        const d = await t.get('/dashboard');
        report.check('tokens', `forged access token (${label}) is refused with valid device cookies`, r.status === 401 && d.status === 307, `${r.status}/${d.status}`);
    }

    // The newest sign-in owns the account; the older device is signed out.
    const first = new Client(app.base, 'dev1'), second = new Client(app.base, 'dev2');
    await signIn(first, U.principal); await signIn(second, U.principal);
    const stale = await first.get('/api/user/settings'); const fresh = await second.get('/api/user/settings');
    report.check('tokens', 'a newer sign-in signs the older device out (single active session)', stale.status === 401 && fresh.status === 200, `${stale.status}/${fresh.status}`);

    // After signing out, replaying the old cookies must not work.
    const out = new Client(app.base, 'logout'); await signIn(out, U.parent);
    const saved = new Map(out.jar);
    await out.req('POST', '/auth/signout');
    const replay = new Client(app.base, 'replay'); saved.forEach((v, k) => replay.jar.set(k, v));
    const rp = await replay.get('/api/user/settings');
    report.check('tokens', 'cookies replayed after sign-out are refused', rp.status === 401, `status ${rp.status}`);

    // Restore usable shared sessions for the groups that follow.
    ctx.sessions.principal = second;
    const parentAgain = new Client(app.base, 'parent'); await signIn(parentAgain, U.parent); ctx.sessions.parent = parentAgain;
}

// ---- hostile uploads ----------------------------------------------------------------
export async function groupUploads(ctx) {
    const { report, sessions, S, app, prisma } = ctx;
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
    const pngWithScript = Buffer.concat([png, Buffer.from('<script>alert(1)</script>')]);
    const files = [
        ['html named .jpg with jpeg mime', Buffer.from('<html><script>alert(1)</script></html>'), 'a.jpg', 'image/jpeg', false],
        ['svg with script', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'a.svg', 'image/svg+xml', false],
        ['html as text/html', Buffer.from('<script>alert(1)</script>'), 'a.html', 'text/html', false],
        ['executable named .png', Buffer.from('MZ\x90\x00\x03'), 'a.png', 'image/png', false],
        ['empty file', Buffer.alloc(0), 'a.png', 'image/png', false],
        ['16 MB image', Buffer.concat([png, Buffer.alloc(16 * 1024 * 1024)]), 'big.png', 'image/png', false],
        ['png with appended script and a traversal filename', pngWithScript, '../../../../etc/passwd.png', 'image/png', 'maybe'],
        ['png with null byte filename', png, 'a.png\u0000.html', 'image/png', 'maybe'],
    ];
    const routes = [
        ['/api/school/upload', 'teacher', { bucket: 'avatars' }],
        ['/api/school/upload', 'student', { bucket: 'submissions' }],
        ['/api/school/upload', 'parent', { bucket: 'receipts' }],
        ['/api/student/assignments/upload', 'student', {}],
        ['/api/school/books/upload', 'owner', { type: 'cover' }],
        ['/api/school/books/upload', 'teacher', { type: 'cover' }],
    ];
    const bad = [], accepted = [];
    for (const [route, who, extra] of routes) {
        for (const [label, bytes, name, mime, expect] of files) {
            const fd = new FormData();
            fd.append('file', new Blob([bytes], { type: mime }), name);
            for (const [k, v] of Object.entries(extra)) fd.append(k, v);
            sessions[who].ip = rotateIp();
            const r = await sessions[who].req('POST', route, { body: fd });
            if (r.status >= 500) bad.push(`${who} ${route} ${label} -> ${r.status}`);
            if (r.status === 200) {
                accepted.push({ route, who, label, url: r.data?.url || r.data?.fileUrl || '' });
                if (expect === false) bad.push(`${who} ${route} ACCEPTED ${label}`);
                if (/\.\.|%2e%2e|\.html|\.svg|\.exe|\u0000/i.test(r.data?.url || r.data?.fileUrl || '')) bad.push(`${who} ${route} stored an unsafe path for ${label}: ${r.data?.url}`);
            }
        }
    }
    const teacherAttempt = await sessions.teacher.req('POST', '/api/school/books/upload', { body: (() => { const f = new FormData(); f.append('file', new Blob([Buffer.from('%PDF-1.4')], { type: 'application/pdf' }), 'b.pdf'); return f; })() });
    report.check('uploads', 'a teacher cannot upload library books', teacherAttempt.status === 403, `status ${teacherAttempt.status}`);
    report.check('uploads', `hostile uploads are refused, nothing is stored under an unsafe name, and no handler errors (${accepted.length} benign files accepted)`, bad.length === 0, bad.slice(0, 12).join(' | '));
}

// ---- list-size abuse -----------------------------------------------------------------
export async function groupSizes(ctx) {
    const { report, sessions } = ctx;
    const lists = ['/api/school/students', '/api/school/teachers', '/api/school/finance/invoices', '/api/school/books', '/api/school/events', '/api/school/authorizations', '/api/director/marklists', '/api/marklist/config/list'];
    const slow = [];
    for (const url of lists) {
        const t0 = Date.now();
        const r = await sessions.owner.get(`${url}?limit=1000000000&page=-5`);
        const ms = Date.now() - t0;
        if (r.status >= 500 || ms > 4000) slow.push(`${url} -> ${r.status} in ${ms} ms`);
    }
    report.check('abuse', 'a huge or negative page size cannot crash or stall a list route', slow.length === 0, slow.join(' | '));
}
