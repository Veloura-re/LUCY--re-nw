## 2025-05-18 - [Hardcoded Database Credentials]
**Vulnerability:** Hardcoded PostgreSQL database credentials (user, password, host, port, database) were found in `app/api/auth/test-db/route.ts` within the pg Pool constructor.
**Learning:** These types of credentials should never be checked into version control. Hardcoded secrets expose critical infrastructure directly to any reader of the source code.
**Prevention:** Always use environment variables (e.g. `process.env.DIRECT_URL` or `process.env.DATABASE_URL`) to securely load database connection strings and ensure credentials do not get committed.

## 2025-07-08 - [Interactive Prompts in CI]
**Vulnerability:** Cloudflare/OpenNext builds (`npx @opennextjs/cloudflare build`) were failing in CI because they encountered an interactive prompt asking to create a `wrangler.jsonc` file.
**Learning:** Tools that expect user input will hang or fail in automated environments if their dependencies or configuration files are missing.
**Prevention:** Ensure required configuration files like `wrangler.jsonc` (even if empty, e.g., `{}`) are present in the repository to bypass interactive prompts in CI workflows.
