## 2025-10-28 - Insecure Random Array Sorting Pattern
**Vulnerability:** The `Math.random() - 0.5` pattern was used for array shuffling in the timetable auto-generation endpoint.
**Learning:** This pattern is biased and predictable, and `Math.random()` itself is not a cryptographically secure random number generator. The codebase provides a `secureRandomInt` utility in `@/lib/security` that should be used for Fisher-Yates shuffling instead.
**Prevention:** Replace all occurrences of `array.sort(() => Math.random() - 0.5)` with a proper Fisher-Yates shuffle utilizing `secureRandomInt`.
