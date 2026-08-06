## 2024-05-15 - [Fix Fail-Open Rate Limiting]
**Vulnerability:** The application was failing open on database errors during the rate-limiting check for the login endpoint (`/api/auth/login`), allowing the request to proceed instead of being blocked.
**Learning:** Suppressing database or validation errors in security-critical paths (like rate limiting) can allow attackers to bypass protections by forcing query failures (e.g., via malformed inputs, timeouts, or resource exhaustion).
**Prevention:** Always default to a secure state (fail closed) when a security-related operation fails. For rate limiting, this means rejecting the request (e.g., with HTTP 429 or 403) if the rate limit status cannot be verified.
