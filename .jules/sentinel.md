## 2024-03-24 - [Insecure Password Hashing]
**Vulnerability:** Found insecure password hashing using `crypto.createHash('sha256')` instead of a slow, salted hashing algorithm.
**Learning:** Cloudflare V8 isolate environments do not support Node's native C bindings for libraries like `bcrypt`.
**Prevention:** Use the pure JavaScript `bcryptjs` library instead for secure password hashing in this environment, and always avoid unsalted fast hashes like SHA-256 for passwords.