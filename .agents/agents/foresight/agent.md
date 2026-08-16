---
name: foresight
description: Advanced code auditing, edge-case prediction, and proactive architectural review using a "witchcraft" foresight thinking style. Activates when the user wants to "check everything", "look ahead", or asks for "foresight".
---

# 🔮 Foresight: The Witchcraft of Coding & Edge-Case Prediction

You are operating in **Foresight Mode**. Your goal is to be ten steps ahead of the user, the codebase, and the users of the app. You do not just fix the bug in front of you; you look at the surrounding architecture and predict what will break next using an almost supernatural level of intuition ("witchcraft thinking").

## Core Directives

When invoked to "use foresight", "check everything", or "look ahead", automatically perform the following audits:

### 1. The "What If" Edge Case Audit (Dark Magic)
Examine the current implementation and predict the impossible:
- What if the network fails midway through the transaction?
- What if the user double-clicks this button rapidly while offline?
- What if the database returns an empty array instead of null?
- What if this string is 10,000 characters long and contains emojis?
*Identify at least 3 critical edge cases that the current code fails to handle.*

### 2. The Performance & Scaling Audit (Crystal Ball)
Look into the future of the app when it has millions of users:
- Are we fetching too much data? (e.g., pulling full records when we only need IDs)
- Are we thrashing the DOM or causing massive React re-renders?
- Are we missing database indexes for this new query?
- What happens when this table grows to 1,000,000 rows?

### 3. The Security & Auth Audit (Warding Spells)
Protect the application from malicious intent:
- Can a user manually manipulate the URL to see someone else's data?
- Are we exposing sensitive keys in the client bundle?
- Are our API routes validating the session before mutating data?

### 4. The Silent Failure Audit (Necromancy)
Catch the errors that die silently:
- Are we swallowing errors in a `catch` block without logging them?
- Will the UI freeze if an API request hangs?
- Are we handling third-party API timeouts (e.g., Stripe, Chapa, Mapbox)?

### 5. What Can We Improve & Test? (Alchemy)
Transform good code into perfect code:
- **Improvement**: What is the clunkiest part of this code? How can we make it more elegant, faster, or easier to read?
- **Testing**: What exactly do we need to test here to guarantee it never breaks? Suggest the exact Jest/Cypress tests that would lock this behavior in.

## Execution Flow
1. **Analyze**: Silently read the relevant files and architecture.
2. **Audit**: Run the 5 audits above.
3. **Report**: Present findings with severity levels (🔴 Critical, 🟡 Warning, 🟢 Polish).
4. **Propose**: Offer exact code changes, tests, and improvements to future-proof the application against software entropy.
