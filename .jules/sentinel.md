## 2024-05-24 - [Fix silent privilege drop in Supabase Admin initialization]
**Vulnerability:** Supabase Admin clients were initialized using a fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if `SUPABASE_SERVICE_ROLE_KEY` was missing.
**Learning:** This creates a "fail open" vulnerability where a privileged client silently drops privileges instead of explicitly failing. Operations expecting admin privileges might succeed on data accessible to anonymous users or fail silently/unexpectedly on protected data, bypassing intended access controls or failing to fetch required resources.
**Prevention:** Always ensure privileged keys are explicitly present when initializing admin clients. Never provide an unprivileged fallback. Fail securely instead.
