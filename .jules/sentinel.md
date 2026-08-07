## 2024-05-18 - [Insecure Randomness in Identifiers]
**Vulnerability:** The codebase was using `Math.random()` to generate student IDs and school codes.
**Learning:** `Math.random()` is not cryptographically secure, and can lead to predictable IDs, which increases the risk of brute-forcing or enumeration attacks, especially in authentication/identification flows.
**Prevention:** Always use a cryptographically secure random number generator (CSPRNG) like `crypto.getRandomValues()` or `globalThis.crypto.randomUUID()` when generating tokens, identifiers, or secrets.
