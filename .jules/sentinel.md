## 2024-05-14 - Hardcoded database credentials
**Vulnerability:** A hardcoded PostgreSQL database connection string including username and password was found in `app/api/auth/test-db/route.ts`.
**Learning:** Developers might accidentally leave hardcoded credentials used for testing or debugging in production-facing API routes.
**Prevention:** Avoid committing hardcoded credentials by using environment variables for all database connections, even in test routes. Regularly scan code for common database default usernames or passwords.
