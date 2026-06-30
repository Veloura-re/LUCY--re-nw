## 2026-06-30 - Remove Hardcoded Database Credentials
**Vulnerability:** Found hardcoded database credentials (username, password, host, port, database) in `app/api/auth/test-db/route.ts`, `delete_schools.ts`, and `scripts/create-superadmin.js`.
**Learning:** Hardcoded credentials expose database access to anyone with source code access.
**Prevention:** Always use environment variables for sensitive configurations, typically `process.env.DIRECT_URL` for database connections in this codebase.
