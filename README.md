# LUCY OS

Multi-tenant school management platform. One deployment serves many schools; every school's data is isolated by `schoolId`.

Roles: `SUPERADMIN`, `OWNER`, `PRINCIPAL`, `TEACHER`, `HOMEROOM`, `PARENT`, `STUDENT`, `ACCOUNTANT`, `RECORDER`. Directors invite accountants (school finance) and recorders (student records) by email from the Finance & Records Staff page. The per-role manual is in `docs/USER_GUIDELINES_BY_ROLE.md`; the architecture blueprint is in `LUCY_OS_MASTER_BRAIN.md`.

## Stack

- Next.js 16 (App Router) and React 19, Tailwind 4
- PostgreSQL through Prisma 5 (`@prisma/adapter-pg`)
- Supabase for authentication, storage and realtime
- Stripe and Chapa for payments, Resend for email, Google Gemini for AI features
- Upstash Redis (or Cloudflare KV) for shared rate limiting
- Deployable to Vercel or Cloudflare Workers (OpenNext)

## Getting started

Requirements: Node.js 22 and a PostgreSQL database (a Supabase project works).

```bash
npm ci
cp .env.example .env.local     # fill in the values described below
npx prisma generate
npx prisma migrate deploy      # or `npx prisma db push` for a throwaway development database
npm run dev
```

## Environment

`.env.example` lists every variable with comments. The ones that gate security-relevant behavior:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Postgres connection strings |
| `DATABASE_SSL_CA` | PEM CA certificate of the database. When set, the database TLS certificate is verified; when unset it is not. Set it in production. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose to the client. |
| `ADMIN_SECRET_KEY` | Shared secret for creating the first `SUPERADMIN`. |
| `QR_HMAC_SECRET` | Signs student QR credentials. Required in production; falls back to `ADMIN_SECRET_KEY`. |
| `CRON_SECRET` | Authorizes scheduled jobs under `/api/cron/*`. |
| `STRIPE_WEBHOOK_SECRET`, `CHAPA_WEBHOOK_SECRET` | Webhook signature verification. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI features. `GEMINI_MODEL` overrides the default model in `lib/ai-config.ts`. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm test` | Run the Jest suite (`tests/`) |
| `npx tsc --noEmit` | Typecheck |
| `npx eslint app components lib hooks utils middleware.ts tests --quiet` | Lint (the CI configuration) |

CI (`.github/workflows/ci.yml`) runs the typecheck, lint, tests and a dependency audit on every push and pull request to `main`.

## Project layout

```
app/            Routes: pages and API handlers (app/api/**/route.ts)
components/     UI components
lib/            Server and shared logic (security, billing, AI, audit, rate limiting)
prisma/         Schema, migrations, RLS policy reference
tests/          Jest tests
scripts/        Operational and seeding scripts (not part of the runtime)
docs/           Role guides and release notes
```

## Engineering rules

The rules in `AGENTS.md` are enforced by tests and review:

- **Tenant isolation.** Every query that touches tenant data is scoped by `schoolId`, and every per-record route checks that the record belongs to the caller. Use `requireRole` and `requireSchoolLinked` from `lib/security.ts`.
- **Audit logging.** Every mutation of billing, exams, grades, attendance, staff or student data calls `logActivity` (`lib/audit.ts`) with a `schoolId`. `tests/route-guardrails.test.ts` fails CI when a mutating route has neither an audit call nor a documented exemption.
- **Static ESM imports.** No `require()` and no dynamic imports of internal modules in routes.
- **AI prompt safety.** Untrusted text (student submissions and any user input) goes into prompts only through `lib/prompt-safety.ts`, which wraps it in boundary tags after neutralizing delimiter variants. The system prompt must state that tagged content is data, never instructions.
- **Uploads.** Use `lib/upload-validation.ts`: MIME allowlist, magic-byte check, size cap, extension derived from the verified type.
- **User preferences.** Client writes go through `lib/user-preferences.ts`; server-owned flags such as `fullAccess` can only be changed by trusted server routes.
- **No emoji** in code, comments, UI strings or logs (`tests/zero-emoji.test.ts`).

## Testing

```bash
npm test
```

Route-level tests replace Prisma and the session helper with in-memory doubles so the real handler logic runs (see `tests/report-card-access.test.ts`). When you add or change a route that reads tenant data, add a case for an unauthenticated caller and for a caller from another school.

## Operations

- Scheduled jobs live under `app/api/cron/*` and are triggered by the platform scheduler configured in `vercel.json`. They require the `CRON_SECRET` bearer token.
- Per-school backups are written to the private `school-backups` storage bucket. Backups exclude credentials. Restoring a backup never changes roles and only touches records that belong to the restoring school.
- Deleting a school archives its audit trail to `school-backups/purged-schools/<schoolId>/` before the data is removed.
- Release history is in `CHANGELOG.md`.
