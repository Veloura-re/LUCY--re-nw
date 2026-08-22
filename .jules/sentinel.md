## 2025-01-28 - [Turnstile CAPTCHA Fail-Open default key]
**Vulnerability:** A testing dummy key (`1x0000000000000000000000000000000AA`) was used as a fallback for the missing `TURNSTILE_SECRET_KEY` environment variable in the login endpoint.
**Learning:** Defaulting to test keys when production keys are missing creates a "fail-open" scenario where attackers can easily bypass security measures like CAPTCHAs.
**Prevention:** If an environment variable is required for a security feature, always reject the request (e.g., return HTTP 500) rather than using a default test key.
