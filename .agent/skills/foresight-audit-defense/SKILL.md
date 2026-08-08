---
name: foresight-audit-defense
description: Deterministic root-cause analysis, pre-flight contract verification, schema-drift prevention, and zero-regression audit defense for full-stack multi-tenant enterprise architectures. Use whenever auditing codebases, debugging recurring regressions, verifying Prisma/database contracts against frontend mappers, preventing cold-start failures, or conducting post-mortems on why systemic bugs escaped QA.
---

# Foresight Audit Defense: Zero-Regression & Contract Integrity Architecture

## 1. Executive Summary & 8-Month Systemic Failure Post-Mortem

### Why Systemic Regressions Persisted Undetected for 8 Months
In large-scale modern full-stack web applications (Next.js App Router, Prisma ORM, Serverless/Edge deployments, Multi-Tenant Postgres, Redis caching), recurring issues often persist unnoticed due to 5 interconnected systemic vectors:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 5 ROOT-CAUSE REGRESSION VECTORS                  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Multi-Runtime Migration Drift (Node <-> Cloudflare Worker <-> Edge) │
│ 2. Silent Failures via Swallowed Exceptions (catch { /* ignore */ })  │
│ 3. Schema Evolution Without Contract Integrity Tests (Prisma Mappers) │
│ 4. Type Erasure & `any` Bypasses in API Boundaries (request.json())    │
│ 5. Isolated Role Testing Blindspots (Admin tested, Parent/Staff missed)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 5 Core Invariants & Prevention Protocols

### Invariant 1: Top-Level Static Module Imports (Eliminate Cold-Start Disruption)
* **The Failure**: Dynamic `require('@/lib/prisma')` or dynamic SDK loads inside serverless handler execution paths fail intermittently during AWS/Vercel/Cloudflare microVM cold-starts, throwing `Connection Interrupted: The institutional connection experienced a momentary disruption during cold-start`.
* **The Rule**: **NEVER** use inline `require()` inside route handlers for core singletons.
* **The Fix**:
  ```typescript
  // ❌ Anti-pattern: Dynamic require inside request lifecycle
  export async function GET() {
      const { prisma } = require('@/lib/prisma'); // FAILS ON COLD START
  }

  // ✅ Deterministic: Top-level static import with connection resilience
  import { prisma } from '@/lib/prisma';
  export async function GET() {
      if (!prisma) throw new ApiError(500, 'Database unavailable');
  }
  ```

### Invariant 2: Non-Silent Observability (Zero-Masked Catch Blocks)
* **The Failure**: Wrapping secondary logic (e.g. audit logging, analytics) in empty `catch {}` blocks masks programming errors like `ReferenceError: request is not defined` or `_userId is undefined`.
* **The Rule**: Log warnings in development/staging and assert variable scope before invoking secondary subsystems.
* **The Fix**:
  ```typescript
  // ✅ Proper safe audit invocation with scoped variable extraction
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                || request.headers.get('cf-connecting-ip') 
                || undefined;
  if (dbUser?.id) {
      logActivity({ userId: dbUser.id, action: 'UPDATE', ip: clientIp }).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
              console.warn('[Audit Warning] Non-blocking log failure:', err);
          }
      });
  }
  ```

### Invariant 3: Prisma Schema Contract Mapping (Schema Drift Defense)
* **The Failure**: When `schema.prisma` relations change (e.g. `parentLinks` vs direct `parents`, `termId` vs `term`), database queries without updated `include` payloads return `undefined`, silently breaking client components.
* **The Rule**: Every API route returning transformed data MUST validate the `include` query against the target interface using TypeScript return type annotations.
* **The Fix**:
  ```typescript
  // ✅ Explicit type contracts between Prisma query & Response JSON
  type StudentFinancialPayload = Prisma.StudentGetPayload<{
      include: {
          class: true;
          parentLinks: { include: { parent: true } };
          invoices: true;
      };
  }>;
  ```

### Invariant 4: Strong API Boundary Typing
* **The Failure**: `const body = await request.json()` typed as `{}` or `unknown` in modern TypeScript leads to unsafe object spreading `{ ...body }` causing runtime `TS2698` or dropping required payload properties.
* **The Rule**: Always cast or validate incoming request bodies with a typed generic or Zod schema:
  ```typescript
  const body = (await request.json()) as ExpectedPayloadType;
  ```

### Invariant 5: Multi-Role Critical-Path Integration Tests
* **The Failure**: Manual testing typically tests single happy-paths (e.g., School Owner dashboard) while neglecting Parent portals, student timetables, fee generation triggers, and webhook verification.
* **The Rule**: Maintain automated integration tests covering all critical paths:
  1. `FeeStructure` -> `Invoice Generation` -> `Payment Settlement (Webhook & Manual)`
  2. `ParentStudentLink` -> `Parent Dossier` -> `Online Bill Pay`
  3. `Room Cache Invalidation` upon new message transmission

---

## 3. Pre-Flight Checklist for Every Feature & Migration

Before marking any task complete, run through the **Foresight Pre-Flight Checklist**:

- [ ] **1. Static Imports**: Are all database clients and services statically imported at file header?
- [ ] **2. Variable Scoping**: Are `request`, `dbUser`, `schoolId`, and `ip` variables defined in the correct scope before any audit or telemetry calls?
- [ ] **3. Strict Type Check**: Does `npx tsc --noEmit` pass with 0 errors across both `/app` and `/components`?
- [ ] **4. Multi-Tenant Scoping**: Is every `findUnique`, `findMany`, `update`, and `delete` query explicitly filtered by `schoolId` / tenant context?
- [ ] **5. Cache Coherency**: Does any write operation (POST, PATCH, DELETE) immediately invalidate its corresponding Redis/memory cache keys?
- [ ] **6. Regression Test**: Is there an automated test verifying the critical path?
