## 2026-10-04 - [Privileged Client Fallback]
**Vulnerability:** Found initialization of `SupabaseAdmin` using `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`.
**Learning:** This introduces a 'fail open' vulnerability where if the privileged key is missing, it falls back to an unprivileged key, causing silent privilege drops and unexpected behaviors.
**Prevention:** Never provide an unprivileged fallback for privileged administrative clients. It is better to crash and fail securely than to proceed without the required privileges.
