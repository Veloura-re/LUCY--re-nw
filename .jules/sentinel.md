## 2024-05-19 - [CRITICAL] Fixed Hardcoded Database Credentials
**Vulnerability:** Hardcoded PostgreSQL pool credentials (including password) in `app/api/auth/test-db/route.ts` and `scripts/create-superadmin.js`.
**Learning:** Hardcoded credentials exposed the database to anyone with source code access. Used `DIRECT_URL` environment variable instead.
**Prevention:** Always use environment variables for sensitive connection strings and secrets.
