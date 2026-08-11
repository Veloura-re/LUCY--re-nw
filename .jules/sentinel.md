## 2024-05-24 - [CRITICAL] Replace insecure Math.random and Node crypto in admin school API
**Vulnerability:** Node.js crypto module and Math.random() usage in API routes targeting Edge runtime
**Learning:** Node.js native crypto bindings crash Cloudflare Workers. Math.random() provides insufficient entropy for school codes and secrets.
**Prevention:** Always use Web Crypto API (globalThis.crypto.getRandomValues) for secure token generation in Cloudflare-compatible applications.
