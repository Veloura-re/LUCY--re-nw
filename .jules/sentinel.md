## 2024-05-24 - Privilege Drop in Supabase Admin Client Initialization
**Vulnerability:** Initializing Supabase admin clients with a fallback to the anonymous key (`process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`).
**Learning:** Providing an unprivileged fallback for a privileged client can cause silent privilege drops and unexpected behaviors, violating the "fail securely" principle.
**Prevention:** Ensure the required privileged key is explicitly present and never provide an unprivileged fallback. Fail securely if the key is missing.
