## 2025-02-13 - Insecure Random Number Generation

**Vulnerability:** Weak randomness and Node `crypto` usage
In `app/api/admin/schools/route.ts` and `app/api/school/students/route.ts`, standard `Math.random()` and Node's `require('crypto')` were used for generating pseudo-random school codes, invite tokens, and student code entropy. `Math.random()` is not cryptographically secure, and using Node's `crypto` module in Edge or Cloudflare Workers can cause runtime exceptions or build failures.

**Learning:** When developing for modern edge environments (like Cloudflare Workers), native Node APIs like `crypto` should be avoided due to missing or incomplete polyfills. Furthermore, standard pseudo-random functions like `Math.random()` are insufficient for generating unique security tokens, ID components, or passwords.

**Prevention:** Always use the standardized Web Crypto API (`globalThis.crypto.getRandomValues()` or `globalThis.crypto.randomUUID()`) for generating secure random values, tokens, and entropy. This ensures cryptographic strength and cross-environment compatibility (Node, Edge, browsers).
