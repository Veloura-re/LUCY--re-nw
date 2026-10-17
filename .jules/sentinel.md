## 2025-05-18 - Math.random() replaces with secureRandomInt
**Vulnerability:** Use of predictable `Math.random()` to generate pseudonyms in `lib/sanctuary-guardrails.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable which shouldn't be used in generating IDs or sensitive information, particularly in a platform handling user pseudonyms or identifiers where predictability can lead to security breaches.
**Prevention:** Avoid `Math.random()`. Instead, always explicitly utilize `secureRandomInt` which uses the Web Crypto API (`globalThis.crypto.getRandomValues`) for operations requiring randomness to ensure cryptographically secure generation.
