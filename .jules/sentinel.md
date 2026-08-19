
## 2024-05-18 - [Weak PRNG and Node crypto in Edge runtime]
**Vulnerability:** Found `Math.random()` used for generating fallback entropy and school codes, as well as `require('crypto')` being used in Next.js API routes that might be deployed to Cloudflare Workers / Edge runtime.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which can lead to collisions or guessing of generated IDs/codes. The `crypto` Node module is not supported natively in the V8 isolates Cloudflare Workers environment. Using it breaks the build/CI entirely.
**Prevention:** Always use `globalThis.crypto.getRandomValues()` or `globalThis.crypto.randomUUID()` for generating secure random values or entropy, as the Web Crypto API is supported globally in standard edge environments like Cloudflare Workers.
