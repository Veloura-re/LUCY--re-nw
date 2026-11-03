---
name: full-system-test
description: Run the LUCY OS live end-to-end security test before any commit that changes code: production build, tagged test schools and one user per role, every page and API attacked as every role, then full cleanup. Use before committing, before pushing, and whenever the user asks to test everything.
---

# LUCY OS full system test

Method: `~/.claude/skills/full-system-test/SKILL.md` (generic). This file is the LUCY specifics.

## Run
1. Fast gate: `npx tsc --noEmit`, `npm test`, `npm run pentest:scan`, `npx eslint app components lib hooks utils middleware.ts tests --quiet`.
2. `npm run build` (must exit 0).
3. `npm run e2e:security` (about five minutes). It sets `E2E_ALLOW_LIVE=yes`, which writes tagged `zztest...` schools and users to the Supabase project in `.env`. The user approved the live project for this; if they have not said so in the current conversation, ask first.
4. Read the report: `/tmp/e2e-report-<tag>.json` (set `E2E_OUT` to change the folder) and the final lines. Every check must pass and `no test data is left behind` must pass.

## What `scripts/e2e/run.mjs` does
- Starts a mock Resend on port 4010 (`RESEND_BASE_URL`), so no email is sent, and the built app on port 3100 with Cloudflare's always-pass Turnstile secret and Upstash blanked.
- Seeds two schools and ten users (superadmin, owner, principal, two teachers, accountant, recorder, student, parent, and a second school's owner and teacher) with Prisma and the Supabase admin API, plus students, an invoice, a pending payment, an internal note and an absence note.
- Groups: anonymous crawl, sign-in with the emailed code, direct-Supabase and forged-cookie bypass, emailed-code rules, role x route matrix (derived from `requireRole` in each GET handler), dashboard pages per role, payments, payroll, student data, privacy, student codes with date of birth, staff invites, files, hardening and rate limits.
- Cleanup: the superadmin session deletes both schools through `DELETE /api/admin/schools/[id]`, then users, audit rows, auth users and archived purge files are removed and counted.

## Extending it
Add a check to the matching `group...` function in `scripts/e2e/run.mjs` whenever a new role, route, payment status, upload path, public endpoint or AI prompt is added, and after every real defect (the check must fail on the old code). Add new route-guard constants to `ROLE_SETS` so the matrix understands them. Registration through Supabase `signUp` is not exercised with real addresses because it uses the project's small email quota.

## Not covered
Google sign-in (needs a real Google account), the production Turnstile check, real email delivery, browser-rendered behavior (script injection, CSP in practice), file uploads, Stripe, Chapa and Gemini routes.
