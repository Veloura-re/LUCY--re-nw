## 2024-05-24 - [Fix silent privilege drop in Supabase Admin initialization]
**Vulnerability:** Supabase Admin clients were initialized using a fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if `SUPABASE_SERVICE_ROLE_KEY` was missing.
**Learning:** This creates a "fail open" vulnerability where a privileged client silently drops privileges instead of explicitly failing.
**Prevention:** Always ensure privileged keys are explicitly present when initializing admin clients. Fail securely instead.

## 2024-05-24 - [Remove hardcoded secrets from worker configuration]
**Vulnerability:** Hardcoded API keys (Gemini, Resend, Gmail) were present in `worker-configuration.d.ts`.
**Learning:** Hardcoding secrets in type definitions exposes them in source control and triggers security scanners to block deployments.
**Prevention:** Always use `string` types for environment variables and secrets in Cloudflare Worker type definitions (`worker-configuration.d.ts`) rather than string literals.
