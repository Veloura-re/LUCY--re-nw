
## 2026-09-08 - Fail-open configurations and string interpolation auth bypass
**Vulnerability:**
1) In `app/api/auth/login/route.ts`, if `TURNSTILE_SECRET_KEY` was missing, it fell back to `1x0000000000000000000000000000000AA` (a Cloudflare Turnstile dummy key), bypassing verification entirely. Also fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY` when `SUPABASE_SERVICE_ROLE_KEY` is not present, escalating or causing unintended behaviors.
2) In `app/api/cron/backups/route.ts`, the authorization check `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` allowed an attacker to bypass the cron backup endpoint by sending an `Authorization: Bearer undefined` header if `CRON_SECRET` was mistakenly unconfigured.
**Learning:** Hardcoded fallbacks to test keys and string interpolation of undefined environment variables lead to critical fail-open vulnerabilities.
**Prevention:** Always explicitly check for the existence of required environment variables before using them in conditionals, validation, or string interpolation. Fail securely (e.g. 500 error) when secrets are missing.
