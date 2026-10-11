## 2025-02-27 - Stripe CI Failure via Eager Initialization

**Vulnerability:** Eager top-level initialization of the Stripe SDK client in shared lib files (`lib/stripe.ts`) without the environment variables being present caused CI worker build failures. Eager initialization in these environments creates build-time crashes or inadvertently pulls in missing environment config when building Next.js pages statically.
**Learning:** Third-party services like Stripe that require environment secrets must not be initialized eagerly at the top level of a module in Next.js/Cloudflare deployments, as it causes Next.js SSG build errors.
**Prevention:** Implement a singleton getter pattern (`export function getStripe() { ... }`) to delay initialization to runtime when request handling actually needs it.
## 2025-02-27 - GenAI CI Failure via Eager Initialization

**Vulnerability:** Eager top-level initialization of the Google Generative AI SDK client in shared lib files (`lib/ai.ts`) without the environment variables being present caused CI worker build failures. This mirrors the previous issue with Stripe.
**Learning:** Third-party services like Google Generative AI that require environment secrets must not be initialized eagerly at the top level of a module in Next.js/Cloudflare deployments, as it causes Next.js SSG build errors.
**Prevention:** Implement a singleton getter pattern (`export function getGenAI() { ... }`) to delay initialization to runtime when request handling actually needs it.
