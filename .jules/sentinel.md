## 2024-05-18 - [Fix Predictable Pseudonym & Timetable Randomization]
**Vulnerability:** Use of `Math.random()` to shuffle schedules and generate pseudonym IDs.
**Learning:** Predictable PRNGs (`Math.random()`) can be exploited to guess internal IDs or manipulate schedule outcomes.
**Prevention:** Always use a CSPRNG such as `secureRandomInt` from `@/lib/security` for any security-sensitive or deterministic randomness, such as pseudonyms or fair-shuffling. Also ensure tests like `route-guardrails.test.ts` don't exempt files bypassing these checks.
