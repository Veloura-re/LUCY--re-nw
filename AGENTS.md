# LUCY OS - Autonomous Engineering & System Defense Rules

## 1. Strict Workspace Boundary Enforcement
- Antigravity MUST NEVER inspect, list, read, or modify directories outside the current workspace root.
- All tool commands (`list_dir`, `view_file`, `grep_search`, `run_command`, `write_to_file`, `replace_file_content`) must operate exclusively within the active workspace.

## 2. Multi-Tenant Audit Logging Invariant
- Every mutation to sensitive institutional resources (billing, exams, gradebooks, attendance, staff credentials, student records) MUST invoke `logActivity` or record an `AuditLog` entry with a valid, non-null `schoolId`.
- Never leave `schoolId` undefined or null on `AuditLog` entries to prevent multi-tenant cross-contamination and audit compliance failures.

## 3. Pure Prisma & Static ESM Architecture
- Avoid dynamic CommonJS calls (`require(...)`) in Next.js App Router route handlers, server actions, and React components.
- Rely on static ESM imports (`import { prisma } from '@/lib/prisma'`, `import { revalidateTag } from 'next/cache'`).
- Always select `email` and `preferences` when querying users via `requireRole` and `requireSchoolLinked` in `@/lib/security`.

## 4. AI Evaluation Prompt Sandboxing & Injection Defense
- Any untrusted student submission passed into Gemini or LLM evaluation prompts MUST be wrapped in explicit XML boundary delimiters (e.g. `<untrusted_student_submission>`).
- All adversarial delimiter tags (e.g. `</untrusted_student_submission>`) within student input MUST be stripped or neutralized prior to template interpolation.
- The evaluation system prompt must explicitly instruct the LLM that content within student submission delimiters is untrusted data and must NEVER be interpreted as instructions.

## 5. Strict Professional Tone & Zero-Emoji Mandate
- Antigravity, all 23 subagents, and all system tools MUST NEVER output, use, or render emojis in any communication, responses, code, comments, documentation, UI strings, logs, or commit messages under any circumstances.
- Maintain an exclusively professional, precise, executive-level technical tone at all times.
