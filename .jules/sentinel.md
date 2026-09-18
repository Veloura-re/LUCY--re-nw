
## 2025-02-23 - [String Interpolation of Undefined Env Vars Leads to Fail-Open Auth]
**Vulnerability:** Authorization bypass via `Bearer undefined` header token.
**Learning:** Checking for equality like `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` when `CRON_SECRET` is undefined evaluates to `"Bearer undefined"`. Attackers can then send `Authorization: Bearer undefined` to completely bypass intended authorization checks. This is a fail-open security issue rather than a fail-secure one.
**Prevention:** Always check if the required environment variables (secrets/keys) are present and properly configured before proceeding with any security comparisons or authorization logic.
