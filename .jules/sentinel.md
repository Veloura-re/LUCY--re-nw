## 2025-02-28 - [Fail-Open Turnstile Protection Bypass]
**Vulnerability:** The login route fell back to Cloudflare's dummy test key (`1x0000000000000000000000000000000AA`) if `TURNSTILE_SECRET_KEY` was missing from environment variables, creating a fail-open scenario where missing configuration bypassed anti-bot protections entirely.
**Learning:** Using test/dummy keys as fallbacks for missing environment variables causes security checks to silently bypass instead of failing securely.
**Prevention:** Always fail securely (e.g., return 500) when required security credentials or API keys are missing.
