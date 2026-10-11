## 2025-02-27 - Stripe CI Failure via Eager Initialization

**Vulnerability:** Eager top-level initialization of the Stripe SDK client in shared lib files (`lib/stripe.ts`) without the environment variables being present caused CI worker build failures. Eager initialization in these environments creates build-time crashes or inadvertently pulls in missing environment config when building Next.js pages statically.
**Learning:** Third-party services like Stripe that require environment secrets must not be initialized eagerly at the top level of a module in Next.js/Cloudflare deployments, as it causes Next.js SSG build errors.
**Prevention:** Implement a singleton getter pattern (`export function getStripe() { ... }`) to delay initialization to runtime when request handling actually needs it.
## 2025-02-27 - GenAI CI Failure via Eager Initialization

**Vulnerability:** Eager top-level initialization of the Google Generative AI SDK client in shared lib files (`lib/ai.ts`) without the environment variables being present caused CI worker build failures. This mirrors the previous issue with Stripe.
**Learning:** Third-party services like Google Generative AI that require environment secrets must not be initialized eagerly at the top level of a module in Next.js/Cloudflare deployments, as it causes Next.js SSG build errors.
**Prevention:** Implement a singleton getter pattern (`export function getGenAI() { ... }`) to delay initialization to runtime when request handling actually needs it.
## 2025-02-27 - Supabase CI Build Failure via Eager Instantiation

**Vulnerability:** A static build error caused CI to fail because Next.js attempts to prerender the `/register/director` page without the necessary Supabase environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, leading to an uncaught crash. In this environment, `.dev.vars` or `.env` are completely missing during `next build` inside the Cloudflare pages container.
**Learning:** Next.js static generation attempts to execute top-level layout or page functions. If they eagerly invoke a Supabase client without variables being mocked or provided, the build crashes abruptly.
**Prevention:** In pages or layouts that require environment variables for dynamic operations (like fetching Supabase user sessions), ensure the route is marked as dynamic using `export const dynamic = 'force-dynamic'` to prevent Next.js from attempting to statically prerender it during the CI build process.
