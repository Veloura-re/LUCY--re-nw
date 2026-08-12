## 2024-05-18 - Insecure Randomness & Node Crypto in Edge Routes
**Vulnerability:** Weak pseudo-random number generator (`Math.random()`) used for generating IDs and security tokens. In addition, Node's `crypto` module was used in API routes which breaks Cloudflare Workers / Edge compilation.
**Learning:** `Math.random()` generates predictable values and should not be used for school codes or fallback entropy IDs. Edge computing platforms strictly prohibit the use of Node-specific C-bound modules like `require('crypto')`.
**Prevention:** Always use the globally available Web Crypto API (`globalThis.crypto.getRandomValues()` or `globalThis.crypto.subtle`) for random generation and cryptographic operations (like HMAC signing) to ensure both security strength and Edge compatibility.
