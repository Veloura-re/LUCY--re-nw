## 2024-03-20 - [Hardcoded Test Key in Auth]
**Vulnerability:** A hardcoded Turnstile test key ('1x0000000000000000000000000000000AA') was used as a fallback if `TURNSTILE_SECRET_KEY` was missing in `app/api/auth/login/route.ts`. This bypasses intended bot protections, allowing attackers to authenticate without valid captchas, creating a fail-open security vulnerability.
**Learning:** Providing dummy fallback values for missing environment variables introduces severe fail-open security risks and violates fail-secure principles. Test keys should never be used as fallback defaults.
**Prevention:** Explicitly check for the existence of required environment variables. If they are missing, return a `500 Server configuration error` rather than silently bypassing security checks.
