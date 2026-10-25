## 2024-06-25 - [Medium] Remove predictable RNG in sensitive modules
**Vulnerability:** Usage of predictable Math.random() in Sanctuary anonymizer and Timetable generation APIs instead of secureRandomInt().
**Learning:** Math.random() usage for generating pseudonyms in peer-support could compromise user privacy and break anonymity if RNG is predicted.
**Prevention:** Always use secureRandomInt() when generating secrets, IDs, and anonymizing data, and ensure route guardrail exclusions are aggressively removed.
