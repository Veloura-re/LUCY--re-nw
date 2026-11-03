// Shared helpers for the live end-to-end security run (scripts/e2e/run.mjs).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

export const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);

export function loadEnv() {
    const env = {};
    for (const file of ['.env', '.env.local']) {
        const p = path.join(ROOT, file);
        if (!fs.existsSync(p)) continue;
        for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
            const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (!m) continue;
            env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        }
    }
    return env;
}

// ---- cookie-jar HTTP client -------------------------------------------------
export class Client {
    constructor(base, name, ip) {
        this.base = base;
        this.name = name;
        this.ip = ip || `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
        this.jar = new Map();
    }
    cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; '); }
    store(res) {
        this.lastSetCookies = res.headers.getSetCookie?.() ?? [];
        for (const line of this.lastSetCookies) {
            const [pair, ...attrs] = line.split(';');
            const i = pair.indexOf('=');
            const name = pair.slice(0, i).trim();
            const value = pair.slice(i + 1).trim();
            const maxAge = attrs.map((a) => a.trim().toLowerCase()).find((a) => a.startsWith('max-age='));
            if (value === '' || (maxAge && Number(maxAge.split('=')[1]) <= 0)) this.jar.delete(name);
            else this.jar.set(name, value);
        }
    }
    async req(method, urlPath, { json, headers = {}, body, redirect = 'manual' } = {}) {
        const h = { 'cf-connecting-ip': this.ip, ...headers };
        const cookie = this.cookieHeader();
        if (cookie) h.cookie = cookie;
        let payload = body;
        if (json !== undefined) { payload = JSON.stringify(json); h['content-type'] = 'application/json'; }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('E2E client request timeout after 15s')), 15000);
        try {
            const res = await fetch(this.base + urlPath, { method, headers: h, body: payload, redirect, signal: controller.signal });
            this.store(res);
            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch { /* html or empty */ }
            return { status: res.status, headers: res.headers, text, data, location: res.headers.get('location') };
        } catch (err) {
            return { status: 504, headers: new Headers(), text: err?.message || 'Gateway Timeout', data: { error: err?.message }, location: null };
        } finally {
            clearTimeout(timer);
        }
    }
    get(p, o) { return this.req('GET', p, o); }
    post(p, json, o = {}) { return this.req('POST', p, { ...o, json }); }
    del(p, o) { return this.req('DELETE', p, o); }
}

// ---- mock Resend (captures every email so none is really sent) ---------------
export function startMockResend(port) {
    const inbox = [];
    const server = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
            if (req.method === 'POST' && req.url.startsWith('/emails')) {
                try { inbox.push({ at: Date.now(), ...JSON.parse(raw) }); } catch { /* ignore */ }
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ id: crypto.randomUUID() }));
            } else { res.writeHead(404); res.end('{}'); }
        });
    });
    server.listen(port, '127.0.0.1');
    const to = (e) => (Array.isArray(e.to) ? e.to : [e.to]).map((x) => String(x).toLowerCase());
    return {
        inbox,
        close: () => server.close(),
        latestCode(email, afterMs = 0) {
            const mail = [...inbox].reverse().find((e) => to(e).includes(email.toLowerCase()) && /sign-in code/i.test(e.subject || '') && e.at >= afterMs);
            const m = mail?.html?.match(/>(\d{6})</);
            return m ? m[1] : null;
        },
        count: (email) => inbox.filter((e) => to(e).includes(email.toLowerCase())).length,
    };
}

// ---- app server -------------------------------------------------------------
export async function startApp({ port, env, logFile }) {
    const out = fs.openSync(logFile, 'w');
    const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
        cwd: ROOT, env: { ...process.env, ...env, NODE_ENV: 'production', PORT: String(port) }, stdio: ['ignore', out, out],
    });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 90; i++) {
        try { const r = await fetch(base + '/login', { redirect: 'manual' }); if (r.status < 500) return { child, base }; } catch { /* not up */ }
        await new Promise((r) => setTimeout(r, 1000));
    }
    child.kill();
    throw new Error('App did not start; see ' + logFile);
}

// ---- reporting ---------------------------------------------------------------
export class Report {
    constructor() { this.rows = []; }
    check(group, name, pass, detail = '') { this.rows.push({ group, name, pass: Boolean(pass), detail: String(detail) }); }
    note(group, name, detail) { this.rows.push({ group, name, pass: true, note: true, detail: String(detail) }); }
    summary() {
        const failed = this.rows.filter((r) => !r.pass);
        const groups = {};
        for (const r of this.rows) { groups[r.group] ??= { pass: 0, fail: 0 }; groups[r.group][r.pass ? 'pass' : 'fail']++; }
        return { total: this.rows.length, failed, groups };
    }
}

export async function deleteUsersEverywhere(prisma, ids) {
    if (!ids.length) return;
    const refs = await prisma.$queryRawUnsafe(`
        SELECT c.conrelid::regclass::text AS tbl, a.attname::text AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.contype = 'f' AND c.confrelid = '"User"'::regclass`);
    for (let pass = 0; pass < 3; pass++) {
        for (const { tbl, col } of refs) {
            await prisma.$executeRawUnsafe(`DELETE FROM ${tbl} WHERE "${col}" = ANY($1::text[])`, ids).catch(() => {});
        }
    }
    await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
}
