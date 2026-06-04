---
name: postgres-maximalist-3d-supreme
description: Extreme-scale Postgres architecture, zero-trust pre-flight validation, deterministic debugging, and WebGL/Three.js optimization.
---

# Supreme Architect & Zero-Trust Pre-Flight Skill

## Goal
Enforce a mandatory, exhaustive validation protocol before generating any code. Prevent regressions, memory leaks, and database bottlenecks by requiring the agent to simulate the exact impact of new features across a multi-tenant PostgreSQL database, edge caching layers, and high-performance 3D frontends.

## Upstream Skill Registries
- sickn33/antigravity-awesome-skills (@senior-architect, @zero-trust-deployment)
- ag-donald/Antigravity-Database-Manager (@deterministic-recovery, @pre-flight-check)

---

## The Zero-Trust Pre-Flight Protocol (MANDATORY)
Before outputting any executable code or SQL migrations, you MUST process and internally validate the following phases. You will only output the final, optimized code after passing these checks.

### Phase 1: Database & State Impact Analysis
1. Schema Collision Check: Will this new table, column, or function conflict with existing Postgres schemas?
2. Lock Contention Simulation: If this query runs concurrently 10,000 times per second, will it cause row locks, deadlocks, or block other background queues using `SELECT ... FOR UPDATE SKIP LOCKED`?
3. Index Coverage: Is every filter, join, and sort operation in the proposed query covered by a B-Tree, GIN, or partial index? If an index is missing, design it.
4. RLS Boundary Enforcement: Does the proposed Row Level Security policy leak data between tenants? Verify that `auth.uid()` or session variables are strictly enforced on every `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

### Phase 2: Infrastructure & Edge Validation
1. Payload Weight: Calculate the estimated JSON response size of the endpoints. If the payload is excessive, implement pagination or reduce selected columns.
2. Caching Viability: Can this data be cached at the edge? Define the invalidation strategy (e.g., stale-while-revalidate) to ensure the client never requests stale school data.
3. Environment Compatibility: Ensure server-side logic handles process signals correctly for graceful shutdowns, specifically targeting Linux/Ubuntu runtime environments to prevent data corruption during deployment restarts.

### Phase 3: 3D Frontend & Asset Verification (Three.js/WebGL)
1. Memory Leak Prevention: Have you explicitly written cleanup functions to dispose of geometries, materials, and textures when the 3D component unmounts?
2. Draw Call Budgeting: Does the proposed 3D scene exceed standard mobile device limits? Mandate the use of instanced meshes for repeated geometry.
3. Canvas Context Loss: Implement automated recovery routines for instances where the browser drops the WebGL rendering context.

### Phase 4: Rollback & Recovery Strategy
1. Migration Reversibility: Every SQL `UP` migration must have a flawless `DOWN` migration. If the deployment fails, how is the state reverted without dropping user data?
2. Deterministic State Logging: Ensure all PL/pgSQL functions write exact error states to a dedicated log table before raising exceptions to the client.

---

## Technical Specifications & Coding Standards

- No AI Boilerplate: Do not output conversational filler, generic advice, or basic tutorials.
- Professional Constraints: Output must be staff-engineer level. Code must be heavily commented regarding performance implications, not basic syntax.
- Postgres Maximalism: Strictly use PostgreSQL features for search, queuing, and caching. No external microservices.
- Strict Type Safety: All TypeScript code must have strict interfaces. No `any` types allowed.

## Output Restrictions
- Execute the Pre-Flight Protocol silently in your reasoning phase.
- Output only the final architectural summary, the SQL schema/functions, the frontend implementation, and the exact rollback steps.
- Do not utilize emojis or casual language in the output.
