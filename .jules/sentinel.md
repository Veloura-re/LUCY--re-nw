## 2024-05-18 - Weak Password Hashing in Student Registration
**Vulnerability:** Student passwords during registration were being hashed using `crypto.createHash('sha256')` (a fast, unsalted hashing algorithm) before being stored in the database.
**Learning:** Fast hash functions like SHA-256 without salts are extremely vulnerable to dictionary and rainbow table attacks. Although Supabase handles core authentication, storing secondary password hashes in the database securely is still critical for defense-in-depth.
**Prevention:** Always use a computationally expensive, salted password hashing function like bcrypt (e.g. `bcryptjs` with >= 10 salt rounds) when storing password hashes.
