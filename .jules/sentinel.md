## 2024-05-24 - [Replace Predictable PRNG with Secure Alternates]
**Vulnerability:** Weak random number generation using `Math.random()` to generate pseudonyms in `lib/sanctuary-guardrails.ts` and for shuffling schedules in `app/api/school/timetable/auto-generate/route.ts`.
**Learning:** `Math.random()` provides a predictable sequence, making it insecure for identity generation and vulnerable to shuffle biases (like the `sort(() => Math.random() - 0.5)` pattern).
**Prevention:** Use `secureRandomInt()` from `@/lib/security` which utilizes the Web Crypto API for cryptographically secure, unbiased generation of random numbers. Replace biased sort-based shuffles with Fisher-Yates utilizing `secureRandomInt()`. Keep tests strict without unnecessary exemptions.
