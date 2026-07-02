## 2024-07-02 - Hardcoded Production Credentials

**Vulnerability:** Production database credentials (including password `Amsocookd2133#`) were hardcoded in multiple locations including `app/api/auth/test-db/route.ts` and administrative scripts (`delete_schools.ts`, `scripts/create-superadmin.js`, `scratch/verify-assignments.js`).
**Learning:** Even diagnostic or test endpoints in production codebases can leak credentials if not relying on environment variables. Hardcoding the `pg` Pool credentials bypasses the secure environment variable configuration (e.g., `DIRECT_URL`).
**Prevention:** Always use environment variables (`process.env.DIRECT_URL` or `process.env.DATABASE_URL`) for database connections instead of inline strings, and use automated scanners to block commits containing high entropy strings or known secrets.
