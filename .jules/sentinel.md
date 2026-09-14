
## 2025-03-09 - [Insecure Random Number Generation]
**Vulnerability:** Weak random number generation using `Math.random()` for identifier generation in Sanctuary Guardrails pseudonyms.
**Learning:** It was not using cryptographically secure random values, violating security best practices for identifier generation.
**Prevention:** Use `globalThis.crypto.getRandomValues()` for sensitive identifiers.
