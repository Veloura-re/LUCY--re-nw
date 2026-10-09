## 2024-03-20 - [Hardcoded Test Key in Auth]
**Vulnerability:** A hardcoded Turnstile test key ('1x0000000000000000000000000000000AA') was used as a fallback if `TURNSTILE_SECRET_KEY` was missing in `app/api/auth/login/route.ts`. This bypasses intended bot protections, allowing attackers to authenticate without valid captchas, creating a fail-open security vulnerability.
**Learning:** Providing dummy fallback values for missing environment variables introduces severe fail-open security risks and violates fail-secure principles. Test keys should never be used as fallback defaults.
**Prevention:** Explicitly check for the existence of required environment variables. If they are missing, return a `500 Server configuration error` rather than silently bypassing security checks.

## 2024-03-20 - [Build Failure: Third-party client initialization in Edge functions]
**Vulnerability:** Not a direct vulnerability, but a deployment-blocking issue. The application failed to build on Cloudflare Workers because top-level initialization of third-party clients (Stripe, GoogleGenerativeAI, Resend) was used. In Edge environments, if these rely on environment variables that are undefined at build time or use Node-specific APIs implicitly, it causes a `Failed to collect page data` error or compilation crashes.
**Learning:** To prevent OpenNext/Cloudflare build errors during Next.js static generation, avoid top-level initialization of database clients (e.g., Supabase) or third-party services (e.g., Stripe) that require environment variables in API routes.
**Prevention:** Use a singleton getter pattern (e.g., `let instance = null; export function getInstance() { ... return instance; }`) to initialize clients lazily inside the request handler.
