## 2023-10-27 - [CRITICAL] Fix test keys fail-open vulnerability
**Vulnerability:** Several endpoints and integrations (Turnstile, Stripe, Dev Reset) used hardcoded dummy secrets or test keys as default fallbacks when environment variables were missing.
**Learning:** Using test keys as fallbacks causes "fail-open" scenarios where security validations seamlessly pass (e.g., Turnstile test keys accepting any token) or malicious actions succeed (dev-reset accepting the hardcoded dummy secret), silently bypassing intended protections in production.
**Prevention:** Never provide fallback strings for secrets. Conditionally initialize services or explicitly throw a 500 server error if required security configuration is absent.
