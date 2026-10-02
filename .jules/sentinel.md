## 2024-05-24 - [Privilege Drop Vulnerability in Supabase Admin Client Initialization]
**Vulnerability:** Initializing privileged administrative clients (like Supabase Admin) with an unprivileged fallback (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`) when `SUPABASE_SERVICE_ROLE_KEY` is missing.
**Learning:** This fallback causes silent privilege drops and unexpected behaviors (fail-open) rather than failing securely.
**Prevention:** Always require the `SUPABASE_SERVICE_ROLE_KEY` explicitly without unprivileged fallbacks to adhere to fail-secure principles.
