# LUCY continuation notes

Last updated: 2026-11-28

## Completed and pushed

- Commit `df6534d`: added missing Prisma PostgreSQL dependencies to the admin app.
- Commit `bd3056e`: generate Prisma Client as part of the admin build. Vercel's admin project is configured with output directory `apps/admin/.next`.
- Commit `45e0dc1`: simplified the role onboarding guide and interactive tour, and added a regression test for the supplied image `onerror` XSS payload.
- Production deploy for the main LUCY app completed successfully. `https://www.5-cn.net/` returned 200.
- Admin production deployment is Ready at `https://4xctrl.lc9s.5-cn.net`. Cloudflare DNS CNAME points to `e2adc64fe6b1db68.vercel-dns-017.com` with proxy disabled.

## Verification

- `tests/security-audit.test.ts`: 8 tests passed, including the image-event-handler payload test.
- ESLint on changed files: no errors (existing warnings remain).
- Full `tsc --noEmit` currently reports a separate error in untracked `prisma/scripts/create-superadmin.ts`: `Property 'email' does not exist on type 'never'`.
- Admin login route responds 200. `/` and `/superadmin` respond 307 because they redirect to login when unauthenticated. No authenticated superadmin sign-in was performed, so dashboard functionality has not been verified.

## Continue next

- User asked to make English across the software much easier. Only the role tutorial and interactive tour were simplified so far; continue reviewing user-facing screens, starting with dashboard, help, onboarding, common forms and errors. Preserve legal/privacy language accuracy and product/security behavior.
- User asked whether the superadmin works. Verify with a valid authorized superadmin login/session and non-mutating dashboard reads before claiming it works. Do not print or commit credentials.
- Current `git status` contains unrelated untracked user files `apps/admin/.gitignore` and `prisma/scripts/`; leave them alone unless specifically asked.
