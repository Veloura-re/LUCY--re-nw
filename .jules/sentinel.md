## 2023-10-24 - [CRITICAL] Fail-Open Authentication Bypasses
**Vulnerability:** The login endpoint `app/api/auth/login/route.ts` used unprivileged keys and static dummy values (e.g., Turnstile fallback `'1x0000000000000000000000000000000AA'` and Supabase anon key `NEXT_PUBLIC_SUPABASE_ANON_KEY`) as fallbacks when critical environment variables were missing.
**Learning:** Using permissive fallbacks for missing security configuration disables the intended protection and leads to silent authentication bypasses/privilege drops.
**Prevention:** Always "fail securely". Verify environment variables explicitly, and if essential secrets are missing (e.g., `TURNSTILE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`), abort the operation with a 500 status rather than defaulting to permissive placeholders.
