# LUCY OS — Changelog

All notable changes, security enhancements, and feature releases for LUCY OS are documented here.

## [3.5.0] — 2026-11-01

### Security
- **Emailed sign-in code**: after a correct password, accounts with a real email must enter a 6-digit code (10 minutes, five tries, single use, stored only as a keyed hash). A browser that completed the code can be trusted for 30 days (sliding) and then skips it; changing the password or choosing Forget trusted devices in Settings revokes them. Accounts with a placeholder `@lucy.local` address stay password-only.
- **Sign-in is enforced on the server, not only on the login page**: every API route (`requireAuth`), the dashboard and admin layouts and the middleware now require the device session this server issues after the full sign-in. A Supabase session obtained by calling Supabase Auth directly with a password is refused everywhere. Bearer tokens are no longer accepted by `requireAuth`, and the unused `/api/auth/register-session` route (which could mint a device session without the code) was removed.
- **Google sign-in for existing accounts only**: the Google account must have a verified email that matches an existing user; an unmatched Google sign-in creates nothing (the new auth user is deleted) and is rejected. Google sign-in skips the code.
- Sign-in codes are never printed to the server log in production when no mail key is configured.

### Fixed (found by the live end-to-end security run)
- **Platform sign-in log**: `/api/admin/security/audit-logs` returned every school's login emails and IP addresses to any school owner or principal; it is now superadmin-only.
- **Absence notes**: `GET /api/school/authorizations` returned the whole school's absence notes, student codes and requester emails to every signed-in user. Staff still see the school; parents see their own requests and linked children, students their own, and finance/records staff are refused.
- **Subscription receipts**: `GET /api/school/billing/receipt` is limited to owners, principals and the superadmin.
- Missing or wrong sign-in on 28 API routes now answers 401/403 instead of 500.
- A superadmin opening the books list no longer causes a 500.

### Added
- `/login/verify` page, `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp`, `DELETE /api/user/trusted-devices`, and the `LoginChallenge` and `TrustedDevice` tables (migration `20261103000000_add_login_otp_and_trusted_devices`).
- New environment variable `OTP_HMAC_SECRET` (required in production).
- The `pentest` rule and skill are installed globally for Claude Code and Gemini/Antigravity (`~/.claude`, `~/.gemini`), and for Antigravity in this repository (`.agent/skills/pentest`).

### Changed
- After registering (invite, director, parent, student, administrator) the user is signed out and asked to sign in once, which also proves their email with a code.

## [3.4.1] — 2026-11-01

### Security
- **Payments**: only finance roles can list, confirm or reject pending payments and use the card terminal; teachers can no longer settle an invoice. Confirmation accepts only `SUCCESS` or `FAILED`.
- **Rate limiting**: the client IP is taken only from the header the host overwrites (`x-real-ip` on Vercel, `cf-connecting-ip` elsewhere). A caller can no longer pick its own bucket or pose as localhost; loopback is exempt outside production only.
- **Student codes**: linking a parent, registering a parent with a code, registering a student, and the public code check now also require the student's recorded date of birth, with one error for any mismatch. Students without a recorded date of birth cannot be claimed until the school adds it.
- **Files**: payment receipts are readable by finance roles only; student coursework by its author and teaching staff.
- **Report cards**: internal notes are shown only to leadership and the class's homeroom teacher.
- **Chapa webhook**: concurrent deliveries of one event are serialized, so access cannot be extended twice.
- **Payroll**: the hardcoded fallback school was removed.

### Added
- `pentest` skill (`.claude/skills/pentest/SKILL.md`), `npm run pentest:scan`, and a pre-push attack-review rule in `AGENTS.md`.

## [3.4.0] — 2026-10-31

### Security
- **Private file storage**: uploaded files (photos, logos, books, coursework, receipts) are served through `/api/files/<bucket>/<path>`, which checks the caller's school and redirects to a short-lived signed URL. Run `scripts/migrate-file-urls.ts --apply` and then `storage-private-files.sql` (in that order) when deploying.
- **Tenant-scoped storage writes**: `storage-hardening.sql` limits uploads and deletes to the caller's own school folder.
- **Sanctuary retention**: messages are deleted when a session ends unless it was reported; all session records are removed after 30 days.
- **AI telemetry**: prompts and responses are no longer sent to analytics, only sizes and token counts.

### Added
- **Accountant and Recorder roles**: directors (principal or owner) invite them by email from the new Finance & Records Staff page. Accountants run school finance (fees, invoices, expenses, payment checks, payroll) but not the school's LUCY subscription; recorders create and edit student records but cannot delete them or see finance. Run the `add_accountant_recorder_roles` migration before deploying.
- **Recorded consent**: acceptance of the Terms and Privacy Policy is stored per user and version (`ConsentRecord`). Users are asked to accept again when `LEGAL_VERSION` changes.
- **Backup retention**: automatic backups are removed after 30 days and manual ones after 90, always keeping the newest three. Backup download links are refreshed on every listing.

### Changed
- The student registry and class pages, and the student list API, now check an allow-list of staff roles. Previously any signed-in user who was not a parent or student could open them.
- Privacy Policy and Terms of Service rewritten to match the platform's actual data handling; school deletion now also removes stored backups and uploads.

## [3.3.0] — 2026-08-21

### Fixed
- **Atomic Session Management & Eviction Defense**:
  - Eliminated false-positive concurrent session eviction loops in dashboard layout.
  - Implemented dual-runtime database active session synchronizer with Prisma and Supabase Admin fallback.
  - Standardized device session cookie issuance in authentication route handlers.

- **Production CSRF & Domain Verification**:
  - Normalized host and origin verification in middleware to support Cloudflare edge proxies and custom production domains.

- **Postgres Pooler TLS Compatibility**:
  - Sanitized connection strings to prevent self-signed certificate chain rejection on Supabase poolers.

### Security
- **Production Endpoint Hardening**:
  - Disabled dev-reset, debug-ingest, and test-edge endpoints in production runtime.
  - Enforced webhook signature validation across billing reconciliation routes.
  - Verified 100% compliance across all 17 Technical Defense Sentinels.

## [3.2.0] — 2026-08-06

### Added
- **Universal 100+ World Languages Engine**:
  - Searchable Backlit UI language selector modal with 100+ world languages, flags, and ISO codes ([components/ui/language-toggle.tsx](file:///home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede/components/ui/language-toggle.tsx)).
  - Automatic browser locale auto-detection (`navigator.language`) and local persistence via `localStorage` + `cookie` (`lucy_language`).
  - Native Right-To-Left (RTL) text direction (`dir="rtl"`) for Arabic (`ar`), Hebrew (`he`), Persian (`fa`), and Urdu (`ur`).
  - Pre-compiled dictionaries for English, Amharic, Oromo, Tigrinya, Swahili, French, Spanish, and Arabic ([lib/i18n/translations.ts](file:///home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede/lib/i18n/translations.ts)).

- **Password Reset UI & Recovery Protocol**:
  - Dedicated `/reset-password` page with real-time password strength validation score, uppercase/number/special char requirements, and show/hide toggles ([app/reset-password/page.tsx](file:///home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede/app/reset-password/page.tsx)).
  - Updated email recovery links to route through `/auth/callback?next=/reset-password` ([app/api/auth/forgot-password/route.ts](file:///home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede/app/api/auth/forgot-password/route.ts)).
  - Added green success alert banner on `/login?reset=success`.

### Fixed
- **Vercel Static Prerender Build Stability**:
  - Hardened `utils/supabase/client.ts` and `utils/supabase/server.ts` with default fallback parameters (`DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY`) to prevent build crashes on Vercel when env vars are unpopulated during static export.
  - Added `try/catch` fallbacks in `lib/services/students.ts`, `teachers.ts`, and `attendance.ts` to seamlessly fall back to Prisma database connection pool (`DATABASE_URL`) on localhost.

### Changed
- **Anime.js 60fps Theme Transition**:
  - Updated theme toggle animation to Vertical Drop Wave top-to-bottom curtain drop (`cubic-bezier(0.22, 1, 0.36, 1)`).
