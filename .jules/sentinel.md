## 2025-02-12 - Hardcoded DB Credentials in Diagnostic Route
**Vulnerability:** A diagnostic test route (`app/api/auth/test-db/route.ts`) contained hardcoded production/staging database credentials for PostgreSQL connection testing.
**Learning:** Diagnostic or test routes created for temporary debugging often get committed to the codebase containing hardcoded secrets if environment variables are not used from the start.
**Prevention:** Always use environment variables (e.g., `process.env.DATABASE_URL`) even for quick test scripts or diagnostic routes. Never hardcode credentials into the source code, no matter the purpose.
