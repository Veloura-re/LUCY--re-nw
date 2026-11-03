## 2025-02-28 - Insecure Randomness in Security Sensitive Areas
**Vulnerability:** The `app/api/school/timetable/auto-generate/route.ts` and `lib/sanctuary-guardrails.ts` use the predictable `Math.random()` function to shuffle timeslots and generate identifiers.
**Learning:** `Math.random()` generates pseudorandom numbers that can be easily predicted, compromising any cryptographic or security-sensitive functions. The project provides a `secureRandomInt` utility specifically for this purpose in `@/lib/security`.
**Prevention:** Always use cryptographic PRNG such as Web Crypto API (`crypto.getRandomValues()`) or predefined utilities (`secureRandomInt`) in backend and sensitive contexts instead of `Math.random()`.
