## 2024-10-12 - Weak randomness using Math.random() in secure/predictable contexts
**Vulnerability:** Found multiple usages of `Math.random()` for generating sensitive IDs (student code fallback), school codes, and mock customer IDs.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs, which is a security risk for identifiers that should be hard to guess.
**Prevention:** Use `globalThis.crypto.randomUUID()` or `globalThis.crypto.getRandomValues()` to generate cryptographically secure random numbers or IDs.
