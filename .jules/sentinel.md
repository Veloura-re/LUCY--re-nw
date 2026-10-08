## 2026-10-08 - [Privilege Escalation / Fallback Vulnerability]
**Vulnerability:** Initializing privileged administrative clients (like Supabase Admin) with a fallback to an unprivileged key (like `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
**Learning:** Providing an unprivileged fallback for a privileged key causes silent privilege drops, unexpected behaviors, and allows unprivileged actions to execute under the guise of an admin client.
**Prevention:** Ensure the required privileged key (e.g., `SUPABASE_SERVICE_ROLE_KEY`) is explicitly present without any fallbacks. Fail securely if the key is missing.
## 2026-10-08 - [Edge Compatibility]
**Vulnerability:** Edge runtime incompatibility caused by Node's native `crypto` module imports (`import crypto from 'crypto'`) and bare `crypto` references (e.g. `crypto.randomUUID()`).
**Learning:** Cloudflare Workers and Next.js Edge runtime environments do not natively support Node's C++ `crypto` module. Utilizing it results in CI build failures or runtime crashes.
**Prevention:** Avoid Node's `crypto` module entirely in Edge routes. Always use the Web Crypto API explicitly scoped to `globalThis` (e.g. `globalThis.crypto.getRandomValues()`, `globalThis.crypto.subtle`, and `globalThis.crypto.randomUUID()`).
