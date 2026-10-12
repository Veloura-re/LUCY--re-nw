## 2024-10-12 - Weak randomness using Math.random() in secure/predictable contexts
**Vulnerability:** Found multiple usages of `Math.random()` for generating sensitive IDs (student code fallback), school codes, and mock customer IDs.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs, which is a security risk for identifiers that should be hard to guess.
**Prevention:** Use `globalThis.crypto.randomUUID()` or `globalThis.crypto.getRandomValues()` to generate cryptographically secure random numbers or IDs.
## 2024-10-12 - Undeclared Node crypto module usage in Edge routes
**Vulnerability:** Found usages of bare `crypto.randomUUID()` in auth Edge routes without importing the `crypto` module, or relying on Node globals which fail in Edge runtimes like Cloudflare Workers.
**Learning:** Relying on implicit Node.js `crypto` globals or importing Node.js `crypto` in Edge routes causes build and runtime failures on V8 isolate environments.
**Prevention:** Always explicitly use `globalThis.crypto.randomUUID()` or `globalThis.crypto.subtle` which is natively supported across all standard Web Crypto API environments including Edge.
