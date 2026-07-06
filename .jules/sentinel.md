## 2024-07-06 - Hardcoded Database Credentials in Codebase
**Vulnerability:** Hardcoded Postgres database connection details (username, password, host, port, database name) were found directly in source code files, specifically `app/api/auth/test-db/route.ts`, `scripts/create-superadmin.js`, and `delete_schools.ts`.
**Learning:** Raw credentials were left in the codebase, likely used during testing or local development to connect to a Supabase pooler without configuring environment variables. This exposes production secrets in the source code.
**Prevention:** Always use environment variables (`process.env.DATABASE_URL` or `process.env.DIRECT_URL`) for database connections. Never commit secrets, passwords, or connection strings to source control.
