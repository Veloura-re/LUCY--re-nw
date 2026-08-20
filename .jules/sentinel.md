## 2026-08-20 - [Remove Turnstile Fallback Keys]
**Vulnerability:** Default fallback dummy keys ('1x00...') were present in the Turnstile implementation, causing a fail-open state if the environment variables were not set.
**Learning:** Default test keys undermine the whole purpose of the challenge when misconfigured in production.
**Prevention:** Do not use fallback string test keys. Only use environment variables, and let the API fail if the env variables are missing.
