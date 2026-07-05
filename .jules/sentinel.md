## 2025-07-05 - Fix Timing Attack Vulnerability in Admin Registration
**Vulnerability:** The admin registration endpoint compared the provided secret key against the environment variable using a simple string comparison (`!==`).
**Learning:** This exposes the endpoint to timing attacks, where an attacker can deduce the secret key character-by-character by measuring the time it takes for the comparison to fail.
**Prevention:** Use `crypto.timingSafeEqual` with buffers of equal length for cryptographic comparisons involving secrets.
