## 2024-06-24 - Timing Attack on Secret Key Comparison
**Vulnerability:** In `app/api/auth/register-admin/route.ts`, the admin registration endpoint compared the user-provided `secretKey` against the environment `VALID_SECRET` using a standard `!==` string comparison.
**Learning:** Standard string comparisons in JavaScript short-circuit upon finding the first mismatched character. This allows an attacker to measure the time it takes for the server to respond to guess the secret key character by character (a timing attack).
**Prevention:** Use `crypto.timingSafeEqual()` from Node.js's built-in `crypto` module for comparing sensitive secrets. Since `timingSafeEqual` requires buffers of the exact same length, ensure you check lengths before comparing to prevent crashes.
