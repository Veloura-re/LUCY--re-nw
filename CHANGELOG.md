# LUCY OS — Changelog

All notable changes, security enhancements, and feature releases for LUCY OS are documented here.

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
