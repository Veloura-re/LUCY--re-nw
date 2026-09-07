## 2026-09-07 - [Bearer undefined Fail-Open Authorization Bypass]
**Vulnerability:** Interpolating an undefined environment variable into an authorization header check creates a predictable secret (`Bearer undefined`), allowing attackers to bypass authentication.
**Learning:** Using template literals (e.g., \`Bearer ${process.env.SECRET}\`) without explicitly checking if the variable exists can lead to a "fail-open" vulnerability where an unconfigured system can be easily bypassed by sending a "Bearer undefined" header.
**Prevention:** Always check if the environment variable containing the secret is defined before attempting to validate an authorization header against it. If it is undefined, fail securely by rejecting the request.

## 2026-09-07 - [Turnstile Dummy Key Fail-Open Bypass]
**Vulnerability:** Using Cloudflare Turnstile test keys (e.g., `1x0000000000000000000000000000000AA`) as a fallback for missing environment variables neutralizes bot protections because test keys always pass verification.
**Learning:** Hardcoding test credentials as fallbacks meant for development ease can accidentally leak into production environments if configuration is missing, rendering critical security protections like CAPTCHA/Turnstile completely ineffective.
**Prevention:** Never use test keys as default fallbacks in production code. Explicitly check for the presence of required configuration variables and fail securely (closed) if they are missing.