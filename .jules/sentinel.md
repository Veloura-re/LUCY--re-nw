## 2025-02-27 - Remove Hardcoded Turnstile Key Fallback
**Vulnerability:** A hardcoded Cloudflare Turnstile test secret (`1x0000000000000000000000000000000AA`) was used as a fallback in the authentication login route. If `TURNSTILE_SECRET_KEY` is not provided in the environment, this test key will silently bypass all Turnstile protections in production environments.
**Learning:** Fallbacks to test keys in authentication or security validations create "fail-open" scenarios that compromise the entire protective mechanism.
**Prevention:** Never provide a fallback literal for secrets. Explicitly check for the existence of the required security configuration and fail securely (e.g., throwing a 500 or returning a 403) when it's absent.
