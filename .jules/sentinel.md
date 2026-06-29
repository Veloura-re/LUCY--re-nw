## 2025-02-23 - Critical: Hardcoded Database Credentials in Route
**Vulnerability:** A test API endpoint (`app/api/auth/test-db/route.ts`) contained hardcoded production-level database credentials (username, password, host, database name).
**Learning:** Debugging/test endpoints are sometimes committed to the repository by accident, leaving hardcoded credentials exposed in the source code.
**Prevention:** Never commit code with hardcoded credentials. Use `.env` variables for configuration, and ensure any temporary test endpoints or debugging routes are removed before merging into the main branch.
