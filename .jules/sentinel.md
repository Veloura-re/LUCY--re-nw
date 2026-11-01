## 2024-11-01 - [Predictable Math.random() usage in Sanctuary]
**Vulnerability:** Weak PRNG (`Math.random()`) was being used for generating anonymous pseudonyms in the `lib/sanctuary-guardrails.ts` service.
**Learning:** `Math.random()` generates predictable values. Using it to assign identifiers in security-sensitive or anonymous systems compromises user isolation and allows attackers to guess identifiers, reducing anonymity or potentially tracking users.
**Prevention:** Rely strictly on Web Crypto API (`globalThis.crypto.getRandomValues`) or the provided `secureRandomInt` helper for any randomized data, especially IDs. Update automated codebase guardrail tests to enforce this globally without unnecessary file exemptions.
