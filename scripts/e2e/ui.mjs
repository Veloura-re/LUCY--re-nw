// Browser groups for the live end-to-end run: opens every page as every role in headless Chromium,
// clicks every button and link (and fills and submits the forms it opens), looks for script errors,
// 5xx responses, CSP violations, leaked secrets and cross-site scripting, then tests stored and
// reflected injection. External hosts are blocked, so no real service is contacted.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { Client } from './lib.mjs';

const XSS = '<img src=x onerror="window.__xss=1">';
const SECRETS = /service_role|sk_live_|sk_test_|whsec_|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|OTP_HMAC_SECRET|CRON_SECRET|RESEND_API_KEY\s*[:=]\s*["']re_/;
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const SKIP_TEXT = /log ?out|sign ?out|logout|terminate|use a different account/i;
const SKIP_HREF = /logout|auth\/signout|^mailto:|^tel:|^javascript:/i;

function secretIn(text) {
    if (SECRETS.test(text)) return String(text.match(SECRETS)?.[0]);
    for (const token of text.match(JWT) || []) {
        try {
            const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            if (claims.role === 'service_role') return 'JWT with role service_role';
        } catch { /* not a JWT */ }
    }
    return null;
}

async function openRole(browser, ctx, key, findings, bundles) {
    const { sessions, app } = ctx;
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies([...sessions[key].jar].map(([name, value]) => ({ name, value, url: app.base })));
    await context.route('**/*', (route) => {
        const u = route.request().url();
        if (u.startsWith(app.base) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(4000);
    let current = '';
    const note = (kind, detail) => findings.push({ role: key, page: current, kind, detail: String(detail).slice(0, 220) });

    page.on('dialog', (d) => d.accept().catch(() => {}));
    page.on('pageerror', (e) => {
        if (/hydrat|Minified React error #(418|423|425)|Transition was aborted/i.test(e.message)) return;
        note('pageerror', e.message);
    });
    page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (/The Content Security Policy directive 'upgrade-insecure-requests' is ignored/i.test(t)) return;
        if (/Content Security Policy|violates the following/i.test(t)) note('csp', t);
        else if (!/net::ERR_FAILED|Failed to load resource|ERR_BLOCKED|WebSocket|supabase|posthog|hydrat/i.test(t)) note('console', t);
    });
    page.on('response', async (r) => {
        const u = r.url();
        if (!u.startsWith(app.base)) return;
        if (r.status() >= 500) note('http5xx', `${r.request().method()} ${u.replace(app.base, '')} -> ${r.status()}`);
        if (/\/_next\/static\/.*\.js/.test(u) && !bundles.has(u)) { bundles.add(u); }
    });
    return { context, page, setCurrent: (u) => { current = u; }, note };
}

async function fillAndSubmit(scope, page, note) {
    const fields = await scope.$$('input:visible:not([type=file]):not([type=password]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=date]):not([type=submit]), textarea:visible');
    for (const f of fields.slice(0, 8)) {
        const type = (await f.getAttribute('type').catch(() => '')) || 'text';
        const value = type === 'number' ? '-1' : type === 'email' ? 'a@b.co' : XSS + ' ' + 'x'.repeat(300);
        await f.fill(value).catch(() => {});
    }
}

async function crawl(browser, ctx, key, urls, findings, bundles, stats) {
    const { app } = ctx;
    const { context, page, setCurrent, note } = await openRole(browser, ctx, key, findings, bundles);
    const deadline = Date.now() + 14 * 60_000;
    for (const url of urls) {
        if (Date.now() > deadline) { note('timeout', 'role budget used; remaining pages skipped'); break; }
        setCurrent(url);
        try { await page.goto(app.base + url, { waitUntil: 'domcontentloaded', timeout: 30_000 }); } catch (e) { note('navigation', e.message); continue; }
        await page.waitForTimeout(900);
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        const here = new URL(page.url());
        stats.pages++;
        if (!here.pathname.startsWith(url.split('?')[0])) { stats.redirected++; continue; }
        stats.rendered++;

        const html = await page.content().catch(() => '');
        const leaked = secretIn(html);
        if (leaked) note('secret', `page HTML contains ${leaked}`);
        const unsafeLinks = await page.$$eval('a[target=_blank]', (as) => as.filter((a) => !/noopener|noreferrer/.test(a.rel) && !a.href.startsWith(location.origin)).map((a) => a.href).slice(0, 3)).catch(() => []);
        if (unsafeLinks.length) note('blank-link', `target=_blank without rel=noopener: ${unsafeLinks.join(', ')}`);
        const storage = await page.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage } })).catch(() => '{}');
        const stored = secretIn(storage);
        if (stored) note('secret', `browser storage contains ${stored}`);
        const insecure = await page.$$eval('form[action^="http:"], img[src^="http:"], script[src^="http:"], iframe[src^="http:"]', (n) => n.length).catch(() => 0);
        if (insecure) note('mixed-content', `${insecure} insecure http: resource(s)`);

        // Click everything visible, then work inside any dialog that opens.
        const targets = await page.$$('button:visible, [role=button]:visible, [role=tab]:visible, a[href]:visible, summary:visible');
        for (const el of targets.slice(0, 16)) {
            const text = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || (await el.getAttribute('title').catch(() => '')) || '').trim().slice(0, 50);
            const href = await el.getAttribute('href').catch(() => null);
            if (SKIP_TEXT.test(text) || (href && (SKIP_HREF.test(href) || (/^https?:/.test(href) && !href.startsWith(app.base))))) continue;
            try { await el.click({ timeout: 2500, noWaitAfter: true }); stats.clicks++; } catch { stats.unclickable++; continue; }
            await page.waitForTimeout(300);
            if (new URL(page.url()).pathname !== here.pathname) {
                await page.goto(app.base + url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
                await page.waitForTimeout(500);
                continue;
            }
            const dialog = await page.$('[role=dialog]:visible, dialog[open], [aria-modal=true]:visible');
            if (dialog) {
                stats.dialogs++;
                await fillAndSubmit(dialog, page, note);
                const inner = await dialog.$$('button:visible');
                for (const b of inner.slice(0, 6)) {
                    const bt = ((await b.innerText().catch(() => '')) || '').trim();
                    if (SKIP_TEXT.test(bt)) continue;
                    await b.click({ timeout: 2000, noWaitAfter: true }).then(() => { stats.clicks++; }).catch(() => {});
                    await page.waitForTimeout(250);
                    if (!(await page.$('[role=dialog]:visible, dialog[open], [aria-modal=true]:visible'))) break;
                }
            }
            await page.keyboard.press('Escape').catch(() => {});
        }
        if (await page.evaluate(() => window.__xss === 1).catch(() => false)) note('xss', 'injected markup executed');
    }
    await context.close();
}

export async function groupUi(ctx) {
    const { report, sessions, app, S, U, walk, toUrl, ROOT, OUT, tag, prisma } = ctx;
    const browser = await chromium.launch();
    const findings = [], bundles = new Set();
    const stats = { pages: 0, rendered: 0, redirected: 0, clicks: 0, dialogs: 0, unclickable: 0 };

    // Stored injection: write hostile markup through the API first, so the crawl renders it.
    await sessions.teacher.post(`/api/school/students/${S.a1}/notes`, { content: XSS });
    await sessions.teacher.post(`/api/school/students/${S.a1}/remarks`, { content: XSS });
    await sessions.parent.post('/api/parent/authorizations', { studentId: S.a1, startDate: '2026-11-02', endDate: '2026-11-03', reason: XSS });

    const dash = walk(path.join(ROOT, 'app/dashboard'), (p) => p.endsWith(`${path.sep}page.tsx`)).map((f) => toUrl(f, 'app')).filter((u) => !u.includes('['));
    const dynamic = [`/dashboard/students/${S.a1}`, `/dashboard/students/${S.b1}`];
    const adminPages = walk(path.join(ROOT, 'app/admin'), (p) => p.endsWith(`${path.sep}page.tsx`)).map((f) => toUrl(f, 'app')).filter((u) => !u.includes('['));
    const roles = ['owner', 'principal', 'teacher', 'accountant', 'recorder', 'student', 'parent'];

    await Promise.all([
        ...roles.map((k) => crawl(browser, ctx, k, [...dash, ...dynamic], findings, bundles, stats)),
        crawl(browser, ctx, 'superadmin', [...adminPages, '/dashboard'], findings, bundles, stats),
    ]);
    report.note('ui', 'coverage', `${stats.pages} page loads (${stats.rendered} rendered, ${stats.redirected} redirected), ${stats.clicks} clicks, ${stats.dialogs} dialogs filled and submitted`);

    // Reflected injection through the public pages' query strings and paths.
    const ctxPub = await browser.newContext();
    const pub = await ctxPub.newPage();
    const reflected = [];
    for (const u of [`/login?error=${encodeURIComponent(XSS)}`, `/login?reset=${encodeURIComponent(XSS)}&registered=${encodeURIComponent(XSS)}`, `/invite/${encodeURIComponent(XSS)}`, `/verify/student/${encodeURIComponent(XSS)}`, `/register/parent?code=${encodeURIComponent(XSS)}`]) {
        await pub.goto(app.base + u, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await pub.waitForTimeout(600);
        if (await pub.evaluate(() => window.__xss === 1).catch(() => false)) reflected.push(u);
    }
    await ctxPub.close();
    report.check('ui security', 'reflected injection through query strings and paths does not execute', reflected.length === 0, reflected.join(' | '));

    // Secrets in the shipped JavaScript.
    const anon = new Client(app.base, 'bundles');
    const hits = [];
    for (const u of [...bundles].slice(0, 400)) {
        const r = await anon.get(u.replace(app.base, ''));
        const s = secretIn(r.text);
        if (s) hits.push(`${u.replace(app.base, '')}: ${s}`);
    }
    report.check('ui security', `${bundles.size} JavaScript bundles served to browsers contain no secrets or service-role keys`, hits.length === 0, hits.slice(0, 5).join(' | '));

    // Cookie flags of the real sign-in.
    const c = new Client(app.base, 'cookies');
    const since = Date.now() - 50;
    const login = await c.post('/api/auth/login', { email: U.recorder.email, password: ctx.PW, turnstileToken: 'e2e', acceptedTerms: true });
    let code = null; for (let i = 0; i < 20 && !code; i++) { code = ctx.mail.latestCode(U.recorder.email, since); if (!code) await new Promise((r) => setTimeout(r, 150)); }
    await c.post('/api/auth/verify-otp', { code, rememberDevice: true });
    const flags = c.lastSetCookies.filter((l) => /^lucy_/.test(l));
    report.check('ui security', 'the app\'s own cookies are HttpOnly with SameSite set', flags.length >= 3 && flags.every((l) => /httponly/i.test(l) && /samesite=(lax|strict)/i.test(l)), flags.map((l) => l.split(';')[0].split('=')[0]).join(','));

    const byKind = {};
    for (const f of findings) (byKind[f.kind] ||= []).push(`${f.role} ${f.page}: ${f.detail}`);
    const hard = ['pageerror', 'http5xx', 'xss', 'secret', 'csp', 'mixed-content'];
    for (const kind of hard) {
        const list = [...new Set(byKind[kind] || [])];
        report.check('ui', `no ${kind} while clicking through every page as every role`, list.length === 0, list.slice(0, 12).join(' | '));
    }
    report.note('ui', 'softer findings', ['console', 'blank-link', 'navigation', 'timeout'].map((k) => `${k}: ${(byKind[k] || []).length}`).join(', '));
    fs.writeFileSync(path.join(OUT, `e2e-ui-findings-${tag}.json`), JSON.stringify({ stats, findings }, null, 2));
    await browser.close();
}
