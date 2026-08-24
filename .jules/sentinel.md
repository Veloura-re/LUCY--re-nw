## 2026-08-24 - [Avoid Node crypto module in Next.js edge runtime]
**Vulnerability:** Found `require('crypto')` usage in `app/api/admin/schools/route.ts` which crashes the Edge compilation and causes CI build failures.
**Learning:** Using Node's native `crypto` module in Edge routes causes CI build failures.
**Prevention:** Always use Web Crypto API (e.g. `globalThis.crypto.randomUUID()`) to generate secure identifiers and avoid Node's `crypto` module entirely in edge routes.
