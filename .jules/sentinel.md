## 2024-05-18 - [Hardcoded Database Credentials]
**Vulnerability:** Hardcoded PostgreSQL database credentials (user, password, host, port, database) were found in `app/api/auth/test-db/route.ts` within the pg Pool constructor.
**Learning:** These types of credentials should never be checked into version control. Hardcoded secrets expose critical infrastructure directly to any reader of the source code.
**Prevention:** Always use environment variables (e.g. `process.env.DIRECT_URL` or `process.env.DATABASE_URL`) to securely load database connection strings and ensure credentials do not get committed.
