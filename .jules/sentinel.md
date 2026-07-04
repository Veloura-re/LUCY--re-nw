## 2024-05-18 - Hardcoded Database Credentials in API Route
**Vulnerability:** A PostgreSQL connection was initialized with a hardcoded username, password, host, port, and database name in `app/api/auth/test-db/route.ts`.
**Learning:** Even in testing or diagnostic routes (like `test-db`), real credentials can easily slip in and be committed to version control. This codebase connects to Supabase and usually handles Prisma initialization elsewhere, but manual `Pool` creation bypassed standard credential management.
**Prevention:** Always use environment variables (e.g., `process.env.DIRECT_URL`) for database connections. Avoid manual `Pool` instantiations with inline strings, especially in diagnostic tools, and rely on centralized connection utilities (like `lib/prisma.ts`) where possible.
