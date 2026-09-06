## 2025-02-28 - Fail-Open Authorization Bypass via String Interpolation
**Vulnerability:** Authorization bypass caused by string interpolation of undefined environment variables (e.g., `` `Bearer ${process.env.CRON_SECRET}` `` evaluating to `"Bearer undefined"`).
**Learning:** Checking for inequality against an interpolated string containing an undefined variable allows attackers to explicitly pass the string "undefined" to bypass the check. Additionally, falling back to static test keys if an environment variable is missing bypasses intended protections.
**Prevention:** Always explicitly verify that environment variables holding secrets are defined before using them in authorization checks or fallback logic.
