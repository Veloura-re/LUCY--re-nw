## 2024-05-18 - [Fix hardcoded db credentials]
**Vulnerability:** A hardcoded database username, password, host, and connection string were exposed in the source code within a diagnostic test endpoint (`app/api/auth/test-db/route.ts`).
**Learning:** Initializing custom database clients (like `pg` Pool) manually for tests can easily bypass centralized environment variable security layers.
**Prevention:** Always use the centralized exported client instance (like the `prisma` client at `@/lib/prisma`) which natively injects connections securely from runtime environment variables, avoiding any inline secrets.
