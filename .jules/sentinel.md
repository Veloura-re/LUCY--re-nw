## 2025-02-27 - [Fix Hardcoded Database Credentials]
**Vulnerability:** Hardcoded PostgreSQL credentials (username, password, host, port, database name) were found in the `app/api/auth/test-db/route.ts` file.
**Learning:** Development test or diagnostic routes might bypass standard ORM patterns (like Prisma's `DATABASE_URL` in `schema.prisma`) and use lower-level database drivers (like `pg` Pool), making them susceptible to hardcoded credentials during quick testing/prototyping.
**Prevention:** Ensure that all diagnostic/test connections utilize the same environment variables (e.g. `DIRECT_URL`) as the production database configuration, rather than hardcoding.
