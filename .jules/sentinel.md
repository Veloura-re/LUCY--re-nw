## 2024-10-26 - [Medium] Fix biased array shuffling vulnerability
**Vulnerability:** The timetable auto-generation endpoint was using a biased array shuffling mechanism: `array.sort(() => Math.random() - 0.5)`. This is not cryptographically secure and produces a biased distribution.
**Learning:** `Math.random()` should not be used for security-sensitive shuffling. Furthermore, `Array.prototype.sort()` with a random comparator does not yield a truly uniform permutation.
**Prevention:** Instead, implement a Fisher-Yates shuffle utilizing `secureRandomInt` from `@/lib/security` which uses the Web Crypto API to ensure cryptographically secure operations.
