## 2024-07-09 - Hardcoded Database Credentials
**Vulnerability:** A test database connectivity endpoint (`app/api/auth/test-db/route.ts`) hardcoded the PostgreSQL database connection string, including the username, password, host, and database name. This exposes sensitive credentials directly in the source code.
**Learning:** Hardcoded credentials should never be committed to source code. Database connections should use centralized configuration mechanisms (like Prisma client) that securely load credentials from environment variables (`.dev.vars` or `.env`).
**Prevention:** Avoid manually initializing database connections with hardcoded properties anywhere in the codebase. Always reuse the established Prisma client instance (`@/lib/prisma`) for database interactions.
