## 2024-05-18 - Silent Privilege Drop in Supabase Admin Initialization
**Vulnerability:** Initializing a privileged `supabaseAdmin` client with `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` falls back to an unprivileged anon key if the service role key is missing. This causes queries to fail silently or execute with dropped privileges (failing open).
**Learning:** Security-critical initializations must fail securely (throw an error) rather than attempting to self-heal using unprivileged credentials.
**Prevention:** Always enforce the explicit presence of the required privileged key (e.g., `process.env.SUPABASE_SERVICE_ROLE_KEY!`). Do not provide fallback mechanisms for missing secrets.
