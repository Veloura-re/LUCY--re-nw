import fs from 'fs';
import path from 'path';

/**
 * Codebase-wide guard rails. They scan the source instead of exercising routes, so a new route or a
 * careless edit that reintroduces a known class of problem fails the build before it ships.
 */

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, match: (file: string) => boolean, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.next', '.open-next', '.wrangler'].includes(entry.name)) continue;
            walk(full, match, out);
        } else if (match(full)) {
            out.push(full);
        }
    }
    return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const routeFiles = walk(path.join(ROOT, 'app/api'), f => f.endsWith(`${path.sep}route.ts`));
const sourceFiles = [
    ...walk(path.join(ROOT, 'app'), f => /\.(ts|tsx)$/.test(f)),
    ...walk(path.join(ROOT, 'lib'), f => /\.(ts|tsx)$/.test(f)),
    ...walk(path.join(ROOT, 'components'), f => /\.(ts|tsx)$/.test(f)),
];

const AUTH_MARKERS = /requireRole|requireSchoolLinked|requireAuth|requireStudentAccess|requireHomeroomAccess|verifySuperAdmin|isAuthorizedCron|constructEvent|safeEqual|auth\.getUser|getUser\(/;

/** Routes that are intentionally reachable without a session, each with the control that protects it. */
const PUBLIC_ROUTES: Record<string, string> = {
    'app/api/auth/forgot-password/route.ts': 'pre-login; shared rate limit per IP and per address, generic response',
    'app/api/auth/login/route.ts': 'pre-login; Turnstile fails closed, database-backed attempt limiter',
    'app/api/auth/register-admin/route.ts': 'pre-login; requires the master key, strict rate limit',
    'app/api/auth/register/student/route.ts': 'pre-login; requires an unclaimed student access code, rate limited',
    'app/api/auth/test-db/route.ts': 'refuses to run in production',
    'app/api/auth/validate-key/route.ts': 'pre-login; requires an unused invite key',
    'app/api/auth/verify-code/route.ts': 'pre-login; rate limited, returns minimal data',
    'app/api/debug-ingest/route.ts': 'refuses to run in production',
    'app/api/dir/register/route.ts': 'pre-login; requires a valid unexpired invite token',
    'app/api/health/route.ts': 'liveness probe with no data',
    'app/api/public/comments/route.ts': 'public wall; rate limited, moderated before display',
    'app/api/public/security-report/route.ts': 'public disclosure form; rate limited, escaped',
    'app/api/public/stats/route.ts': 'aggregate counts only; rate limited and cached',
    'app/api/uplink/route.ts': 'public contact form; rate limited, escaped',
};

describe('API route authorization', () => {
    test('the scan actually finds the routes it is meant to check', () => {
        expect(routeFiles.length).toBeGreaterThan(80);
        expect(sourceFiles.length).toBeGreaterThan(200);
    });

    test('every API route is authenticated or explicitly listed as public', () => {
        const unexplained = routeFiles
            .filter(f => !AUTH_MARKERS.test(fs.readFileSync(f, 'utf8')))
            .map(rel)
            .filter(r => !(r in PUBLIC_ROUTES));
        expect(unexplained).toEqual([]);
    });

    test('the public route list does not keep entries for routes that no longer exist', () => {
        const existing = new Set(routeFiles.map(rel));
        expect(Object.keys(PUBLIC_ROUTES).filter(r => !existing.has(r))).toEqual([]);
    });

    test('routes that fall back to a development-only response are blocked in production', () => {
        for (const r of ['app/api/auth/test-db/route.ts', 'app/api/debug-ingest/route.ts']) {
            expect(fs.readFileSync(path.join(ROOT, r), 'utf8')).toMatch(/NODE_ENV\s*===\s*['"]production['"]/);
        }
    });
});

describe('known bad patterns', () => {
    test('no authorization decision reads the user-editable user_metadata role or school', () => {
        const offenders = sourceFiles
            .filter(f => !/\.tsx$/.test(f)) // client components may display metadata; the server must not trust it
            .filter(f => /user_metadata\??\.(role|schoolId)/.test(fs.readFileSync(f, 'utf8')))
            .map(rel);
        // app/admin/layout.tsx only compares it to resync the stored value after the database check
        expect(offenders.filter(f => f !== 'app/admin/layout.tsx')).toEqual([]);
    });

    test('security-sensitive code does not use Math.random', () => {
        const sensitive = sourceFiles.filter(f => /(^|\/)(api|lib)\//.test(rel(f)) && !/timetable\/auto-generate|sanctuary-guardrails/.test(f));
        const offenders = sensitive.filter(f => /Math\.random\(/.test(fs.readFileSync(f, 'utf8'))).map(rel);
        expect(offenders).toEqual([]);
    });

    test('API responses do not echo raw exception messages', () => {
        const offenders = routeFiles
            .filter(f => !/test-edge|auth\/test-db/.test(f))
            .filter(f => /(NextResponse\.json|secureJson)\(\s*\{[^}]*?(error|message|details):\s*(e|err|error)\??\.message/.test(fs.readFileSync(f, 'utf8')))
            .map(rel);
        expect(offenders).toEqual([]);
    });

    test('no hardcoded Supabase key or default project URL ships in the client helpers', () => {
        for (const f of ['utils/supabase/client.ts', 'utils/supabase/server.ts']) {
            const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
            expect(src).not.toMatch(/eyJhbGciOi/);
            expect(src).not.toMatch(/supabase\.co/);
        }
    });

    test('no known leaked credential strings remain in tracked source', () => {
        const needles = ['AIzaSyREDACTED_KEY', 'axdrcxrkkdithovm', 're_REDACTED_KEY'];
        const files = [
            ...sourceFiles,
            path.join(ROOT, 'worker-configuration.d.ts'),
            path.join(ROOT, 'wrangler.jsonc'),
            path.join(ROOT, '.env.example'),
        ].filter(f => fs.existsSync(f));
        const hits = files.filter(f => needles.some(n => fs.readFileSync(f, 'utf8').includes(n))).map(rel);
        expect(hits).toEqual([]);
    });
});

describe('audit trail coverage', () => {
    const MUTATION = /export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/;
    const AUDITED = /logActivity|logBillingActivity|auditLog\.create|logAudit|withAudit/;

    /** Mutating routes that are deliberately not written to the per-school audit log. */
    const NOT_AUDITED: Record<string, string> = {
        'app/api/ai/chat/route.ts': 'read-only assistant call; rate limited',
        'app/api/auth/forgot-password/route.ts': 'recorded by the authentication flow',
        'app/api/auth/login/route.ts': 'recorded in auth_audit_logs, shown on the security page',
        'app/api/auth/register-admin/route.ts': 'platform bootstrap; no school exists yet',
        'app/api/auth/register-session/route.ts': 'session bookkeeping',
        'app/api/auth/validate-key/route.ts': 'read-only key check',
        'app/api/auth/verify-code/route.ts': 'failures go to the error log',
        'app/api/client-error/route.ts': 'is the error log writer',
        'app/api/debug-ingest/route.ts': 'development only',
        'app/api/messages/route.ts': 'message content; high volume, moderated separately',
        'app/api/public/comments/route.ts': 'anonymous public input, moderated before display',
        'app/api/public/security-report/route.ts': 'stored as a security report',
        'app/api/uplink/route.ts': 'stored as an access request',
        'app/api/sanctuary/match/route.ts': 'anonymous peer-support session, deliberately not tied to a school record',
        'app/api/sanctuary/message/route.ts': 'anonymous peer-support session, deliberately not tied to a school record',
        'app/api/sanctuary/end/route.ts': 'anonymous peer-support session, deliberately not tied to a school record',
    };

    test('every mutating route writes an audit entry or is listed with a reason', () => {
        const missing = routeFiles
            .filter(f => MUTATION.test(fs.readFileSync(f, 'utf8')) && !AUDITED.test(fs.readFileSync(f, 'utf8')))
            .map(rel)
            .filter(r => !(r in NOT_AUDITED));
        expect(missing).toEqual([]);
    });

    test('the exemption list stays honest', () => {
        const stale = Object.keys(NOT_AUDITED).filter(r => {
            const file = path.join(ROOT, r);
            return !fs.existsSync(file) || AUDITED.test(fs.readFileSync(file, 'utf8'));
        });
        expect(stale).toEqual([]);
    });
});
