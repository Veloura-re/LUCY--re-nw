## 2025-02-23 - [Fail-Open Bot Protection Bypass]
**Vulnerability:** The Cloudflare Turnstile validation fallback in `app/api/auth/login/route.ts` used a test dummy key if `process.env.TURNSTILE_SECRET_KEY` was undefined. This test key always evaluates to success, creating a fail-open authorization bypass vulnerability.
**Learning:** Security mechanisms should never default to a "success" state or fallback to test credentials when configuration is missing. Doing so silently disables the protection mechanism entirely.
**Prevention:** Always use explicit existence checks for required security environment variables and fail securely (e.g., return HTTP 500) if they are missing.
