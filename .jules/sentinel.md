## 2024-11-10 - Fix predictable random number generation in sanctuary pseudonyms
**Vulnerability:** Predictable random numbers generated using `Math.random()` for user pseudonyms, which could lead to deanonymization.
**Learning:** Using `Math.random()` for IDs or sensitive data breaks cryptographic security. Web Crypto API based functions like `secureRandomInt` must be used instead.
**Prevention:** Added a static analysis check (and removed the file's exemption) to strictly prevent `Math.random()` in security-sensitive or identity-generating code.
