## 2025-02-27 - Removed hardcoded Turnstile test key fallback

**Vulnerability:** A hardcoded Cloudflare Turnstile test key was used as a fallback if `TURNSTILE_SECRET_KEY` was missing from the environment. This test key always causes verification to pass in development, which means in a misconfigured production environment, Turnstile validation fails open entirely and bots are allowed to bypass the check.
**Learning:** Using test keys as fallback defaults for missing environment variables creates 'fail open' security vulnerabilities that bypass intended protections entirely.
**Prevention:** Never use test keys as fallback defaults for missing environment variables. Explicitly check for the required variable and return an error if missing (failing securely).
