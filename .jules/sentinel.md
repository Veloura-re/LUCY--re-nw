## 2026-10-08 - [Privilege Escalation / Fallback Vulnerability]
**Vulnerability:** Initializing privileged administrative clients (like Supabase Admin) with a fallback to an unprivileged key (like `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
**Learning:** Providing an unprivileged fallback for a privileged key causes silent privilege drops, unexpected behaviors, and allows unprivileged actions to execute under the guise of an admin client.
**Prevention:** Ensure the required privileged key (e.g., `SUPABASE_SERVICE_ROLE_KEY`) is explicitly present without any fallbacks. Fail securely if the key is missing.
