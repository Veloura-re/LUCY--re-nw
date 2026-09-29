## 2024-05-18 - String Interpolation Fail-Open Vulnerability
**Vulnerability:** Authorization checks using string interpolation of potentially undefined environment variables (e.g., `authHeader !== \`Bearer \${process.env.SECRET}\``) create a "fail open" condition.
**Learning:** If the environment variable is not defined, it interpolates as the string `"undefined"`, meaning an attacker can send a request with the header `"Bearer undefined"` and successfully bypass the security check.
**Prevention:** Always explicitly check if the required environment variable exists (`if (!process.env.SECRET) { return error; }`) before performing string interpolation or security validation.
