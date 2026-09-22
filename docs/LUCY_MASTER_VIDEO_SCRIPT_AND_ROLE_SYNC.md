# LUCY OS — Master Video Production Script & Full Cross-Role Synchronization Manual

Platform: LUCY Education OS (Enterprise Multi-Tenant Edition)  
Document Type: Master Video Production Script & System Synchronization Blueprint  
Target Audience: Video Production Directors, Educational Executives, Institutional Buyers, Software Architects  
Compliance Standard: Strict Professional Tone | Zero-Emoji Mandate | Zero-Trust Audit Invariant  

---

## Executive Overview & Video Architecture

This document provides the complete, authoritative operational script and technical synchronization manual for producing an end-to-end demonstration video of LUCY OS.

The video is structured as a chronological simulation entitled **"A Full Academic Day in LUCY OS"**, spanning all 7 platform roles:
1. SuperAdmin (`SUPERADMIN`): Platform governance, multi-tenant telemetry, cross-campus safety console.
2. School Owner / Director (`OWNER`): Executive finance, fee structures, payroll, high-risk cryptographic approval queues.
3. Principal / Academic Administrator (`PRINCIPAL`): Timetable collision defense, absence excuse authorization, teacher allocations, report dossiers.
4. Teacher / Faculty (`TEACHER`): Daily roll call attendance, AI-assisted exam generation, digital gradebook, lesson repositories.
5. Homeroom Educator (`HOMEROOM`): Cohort-specific attendance consolidation, term grade aggregation, parent communications.
6. Parent / Guardian (`PARENT`): Multi-child switcher, instant absence alerts, digital tuition settlement, excuse note submissions.
7. Scholar / Student (`STUDENT`): Real-time timetable schedule, offline-resilient online exams, grade tracker, and The Sanctuary anonymous peer network.

### Multi-Role Synchronization Architecture

Every user action in LUCY OS propagates through a four-stage reactive pipeline:
1. Client Interaction: A user executes a form submission or button click in the UI.
2. Security & Database Mutation: The request is validated by `requireRole` and `requireSchoolLinked` in `lib/security.ts`, executing an atomic Prisma transaction with mandatory non-null `schoolId` audit logging (`logActivity`).
3. Next.js Tagged Cache Invalidation: The server invokes `revalidateTag(getSchoolTag(TAG, schoolId))` to invalidate server-side caches across active routes.
4. Realtime Broadcast & DOM Refresh: A Supabase Realtime channel (`realtime-dashboard-${schoolId}`) detects PostgreSQL changes (`AttendanceRecord`, `GradeRecord`, `Invoice`, `Assignment`, `Message`) and triggers client-side router refreshes without requiring a manual page reload.

---

## Act 01: The Institution Awakens — Platform Surface & Presentation Engine

- Primary Role Persona: Prospective School Director / Public Visitor
- Route: `/` (Landing Page) & `/deck` (Keynote Presentation)
- Estimated Video Duration: 02:30

### Scene 1.1: The Institutional Landing Page
- Visual Focus: High-resolution capture of the Backlit dark aesthetic, animated particle grid, and institutional metrics counter.
- Camera Motion: Slow pan across the hero section, highlighting the typography and contrast hierarchy.
- Spoken Narration (Voiceover):
  "Welcome to LUCY OS, the autonomous operating system engineered for high-prestige academies and modern educational ecosystems. Traditional school management systems digitize paperwork into static spreadsheets and cumbersome PDF attachments. LUCY OS operates on an entirely different paradigm: an autonomous, multi-tenant platform that continuously calculates weighted academic curves, prevents timetable double-bookings, eliminates tuition leakage, and protects student emotional safety."

### Scene 1.2: Interactive Keynote Presentation & Export Engines
- Route: `/deck`
- Screen Actions:
  1. Click "Projector Mode" (or press hotkey "F") to toggle the 16:9 fullscreen presentation canvas.
  2. Advance through Slide Acts using Arrow Keys to display system capability breakdowns.
  3. Click "PPTX Export" in the top utility toolbar. The browser downloads `LUCY_OS_Keynote_Presentation.pptx` with embedded widescreen layouts and speaker notes.
  4. Click "PDF Export" in the top utility toolbar. The system compiles high-resolution vector landscape slides via client-side PDF synthesis.
- Spoken Narration (Voiceover):
  "From the public surface, institutional leaders can launch the interactive keynote deck or export board-ready PowerPoint and vector PDF presentations with zero server latency."

### Button & Technical Synchronization Matrix — Act 01

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Get Started | `/` (Hero CTA) | Navigates to `/register` | Client route transition | None |
| Sign In | `/` (Navbar) | Navigates to `/login` | Client route transition | None |
| Projector Mode | `/deck` (Toolbar) | Fullscreen API toggle | `document.documentElement.requestFullscreen()` | Local state change |
| PPTX Export | `/deck` (Toolbar) | `downloadDeckAsPPTX()` | Generates PowerPoint binary via `pptxgenjs` | Client-side file stream |
| PDF Export | `/deck` (Toolbar) | `downloadDeckAsPDF()` | Generates vector PDF via `jspdf` | Client-side file stream |
| Launch Trial | `/register` (Form) | `POST /api/auth/register-admin` | Creates `School`, `User` (`OWNER`), `AcademicTerm` | Scopes tenant isolation |

---

## Act 02: SuperAdmin Governance & Multi-Tenant Infrastructure

- Primary Role Persona: Platform SuperAdmin (`SUPERADMIN`)
- Route: `/admin/dashboard`, `/admin/schools`, `/admin/billing`, `/admin/security`
- Estimated Video Duration: 02:15

### Scene 2.1: The SuperAdmin Command Center
- Visual Focus: Multi-tenant telemetry cards showing global school counts, active students, faculty nodes, system throughput, and edge API latency.
- Camera Motion: Smooth zoom into the live health telemetry grid.
- Spoken Narration (Voiceover):
  "At the apex of the platform architecture sits the SuperAdmin Control Center. SuperAdmins maintain cross-campus observability without violating individual tenant privacy boundaries. Every institution operates in an isolated cryptographic tenant workspace, scoped strictly by school identification tags."

### Scene 2.2: Tenant Provisioning & Suspension Controls
- Route: `/admin/schools`
- Screen Actions:
  1. Click "Provision Institution" to open the `<CreateSchoolModal>`.
  2. Input: School Name: "Apex International Academy", Code: "APEX-2026", Domain: "apex.lucy-os.com".
  3. Click "Authorize Tenant Provisioning".
  4. Inspect the newly provisioned tenant row in the directory.
  5. Demonstrate the kill-switch: Click "Suspend Institution" toggle. The tenant state transitions immediately to `SUSPENDED`, locking all faculty and student access.
  6. Click "Reactivate Institution" to restore full operational capability.

### Scene 2.3: Offline Bank Deposit Verification
- Route: `/admin/billing`
- Screen Actions:
  1. Navigate to pending offline billing receipts.
  2. Click on a deposit slip submitted via Commercial Bank of Ethiopia (CBE) or Telebirr.
  3. Inspect the transaction reference, uploaded bank voucher, and subscription duration.
  4. Click "Approve Deposit Receipt". The system updates the institution's active billing status.

### Button & Technical Synchronization Matrix — Act 02

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Provision Institution | `/admin/schools` | `POST /api/admin/schools` | `prisma.school.create`, initializes default settings | `CACHE_TAGS.CLASSES` initialized |
| Suspend Tenant | `/admin/schools` | `PATCH /api/admin/schools/[id]/status` | `prisma.school.update({ status: 'SUSPENDED' })` | Tenant sessions invalidated at Edge Middleware |
| Activate Tenant | `/admin/schools` | `PATCH /api/admin/schools/[id]/status` | `prisma.school.update({ status: 'ACTIVE' })` | Tenant access restored |
| Approve Receipt | `/admin/billing` | `POST /api/admin/billing/verify` | `prisma.billingReceipt.update({ status: 'APPROVED' })` | Updates school subscription term |
| Flush Edge Cache | `/admin/security` | `POST /api/admin/system/cache-purge` | Flushes CDN and Next.js ISR caches | Edge cache purge broadcast |

---

## Act 03: Master Scheduling & Timetable Collision Defense

- Primary Role Persona: Principal (`PRINCIPAL`) / School Director (`OWNER`)
- Route: `/dashboard/timetable`
- Estimated Video Duration: 02:45

### Scene 3.1: The Master Timetable Conflict Grid
- Visual Focus: 5-day weekly grid (Monday through Friday) partitioned into 8 daily periods.
- Camera Motion: Split-screen demonstrating class timetable view alongside teacher assignment roster.
- Spoken Narration (Voiceover):
  "One of the greatest operational friction points in high-capacity campuses is master scheduling. Room conflicts, educator double-bookings, and timetable fragmentation consume weeks of administrator time. LUCY OS solves this with a deterministic, constraint-satisfaction scheduling engine."

### Scene 3.2: Automated Collision-Free Scheduling Engine
- Screen Actions:
  1. Select Class Cohort: "Grade 10 - Section A".
  2. Click "Auto-Generate Timetable" to trigger the constraint solver dialog.
  3. Configure parameters: Check "Overwrite Existing Schedules", Uncheck "Include Weekends".
  4. Click "Execute Collision Defense Algorithm".
  5. The UI displays an animated execution progress bar. In under 800 milliseconds, all 40 weekly slots are populated with zero classroom or faculty collisions.
  6. Attempt an intentional manual collision: Drag a Physics lecture into a slot where the instructor is already booked for Grade 11. The collision sentinel triggers an immediate warning badge and rejects the drop action.

### Button & Technical Synchronization Matrix — Act 03

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Auto-Generate Timetable | `/dashboard/timetable` | `POST /api/school/timetable/auto-generate` | `prisma.timetable.deleteMany` + `createMany` with collision sets | `revalidateTag(getSchoolTag(CACHE_TAGS.CLASSES, schoolId))` |
| Add Period Slot | `/dashboard/timetable` | `POST /api/school/periods` | `prisma.period.create` | Invalidation: `CACHE_TAGS.CLASSES` |
| Save Schedule Slot | `/dashboard/timetable` | `POST /api/school/timetable` | `prisma.timetable.upsert` | Live sync to `/dashboard/teacher/schedule` and `/dashboard/student/timetable` |
| Export Schedule PDF | `/dashboard/timetable` | Client PDF compiler | `jspdf` vector timetable render | Direct browser download |

---

## Act 04: The Morning Bell — Digital Roll Call & Instant Parent Dispatch

- Primary Role Persona: Homeroom Educator (`TEACHER` / `HOMEROOM`)
- Route: `/dashboard/teacher/attendance`
- Estimated Video Duration: 02:15

### Scene 4.1: Fast Digital Roll Call Sheet
- Visual Focus: High-density student cards with student portrait badges, status indicators, and one-tap toggles.
- Camera Motion: Focus on touch-optimized buttons executing in rapid succession.
- Spoken Narration (Voiceover):
  "It is 8:15 AM. Across the campus, educators conduct the morning roll call. Rather than calling paper rosters and routing paper slips to the administrative office, the educator manages attendance through the Smart Authority Log."

### Scene 4.2: Taking Roll Call & Sealing Records
- Screen Actions:
  1. Select Class: "Grade 10 - Section A", Period: "Full Day", Date: Current Date.
  2. Click "Mark All Present" to initialize all 30 students to `PRESENT` status in one click.
  3. Identify student "Dawit Mengistu": Click the Red "Absent" toggle button.
  4. Identify student "Lydia Tadesse": Click the Amber "Late" toggle button and input "Bus delay" into the reason field.
  5. Note student "Kaleb Worku": A gold status pill reads `EXCUSED` and is locked against edits because an authorized absence was approved prior to class.
  6. Click "SEAL RECORDS". The button transitions to "SEALING..." and locks to "SYNC COMPLETE".

### Button & Technical Synchronization Matrix — Act 04

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Mark All Present | `/dashboard/teacher/attendance` | Client state setter | Updates React state `setAll('PRESENT')` | Local UI state |
| Mark All Absent | `/dashboard/teacher/attendance` | Client state setter | Updates React state `setAll('ABSENT')` | Local UI state |
| Absent Toggle | `/dashboard/teacher/attendance` | Client state setter | Sets individual student to `ABSENT` | Local UI state |
| Late Toggle | `/dashboard/teacher/attendance` | Client state setter | Sets individual student to `LATE` | Local UI state |
| SEAL RECORDS | `/dashboard/teacher/attendance` | `POST /api/school/attendance` | `prisma.$transaction`: deletes old, inserts locked `AttendanceRecord` batch | `revalidateTag(CACHE_TAGS.SCHOOL_ATTENDANCE)`, Supabase channel dispatches alert |

---

## Act 05: Family Transparency — Multi-Child Portal & 3-Second Absence Alert

- Primary Role Persona: Parent / Guardian (`PARENT`)
- Route: `/dashboard/parent`
- Estimated Video Duration: 02:00

### Scene 5.1: Real-Time Attendance Synchronization
- Visual Focus: Dual-monitor presentation showing Teacher screen on the left sealing attendance, and Parent mobile interface on the right updating in real time.
- Camera Motion: Split-screen zoom into the Parent smartphone notification card.
- Spoken Narration (Voiceover):
  "Watch the synchronization in action. The moment the educator seals the attendance log, the parent portal updates automatically. No manual refresh. No delayed end-of-term surprises. The parent receives an automated SMS dispatch within 3 seconds, and their dashboard reflects the unexcused absence immediately."

### Scene 5.2: Multi-Child Switcher & Child Pairing via Badge Code
- Screen Actions:
  1. Inspect the Parent Command Center showing live attendance metrics, recent test results, and outstanding tuition balances.
  2. Click the Child Switcher in the top header: Toggle between "Dawit Mengistu" (Grade 10) and "Sara Mengistu" (Grade 7). The entire dashboard view transitions seamlessly.
  3. Click "Link Child via Badge Code" to open the `<PairStudentModal>`.
  4. Enter Student Code: "ST-837291-2026".
  5. Click "Verify Code". The modal returns the student name, grade level, and school crest for verification.
  6. Click "Confirm Pairing". The student profile binds to the parent account with verified cryptographic scoping.

### Button & Technical Synchronization Matrix — Act 05

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Child Switcher Tab | `/dashboard/parent` | Client state toggle | Selects active student context | Local UI re-render |
| Link Child | `/dashboard/parent` | Opens `<PairStudentModal>` | Opens dialog | Local UI state |
| Verify Code | `/dashboard/parent` | `POST /api/parent/link-student` (confirm: false) | Queries student identity by code | Masked student data returned |
| Confirm Pairing | `/dashboard/parent` | `POST /api/parent/link-student` (confirm: true) | `prisma.parentStudentLink.create` | Invalidation: `CACHE_TAGS.STUDENTS` |
| View Report Card | `/dashboard/parent` | Navigates to `/dashboard/reports/[studentId]` | Route transition | Loads verified report card |

---

## Act 06: Absence Excuse Authorization & Atomic Retroactive Excusal

- Primary Role Persona: Parent (`PARENT`) & Principal (`PRINCIPAL`)
- Route: `/dashboard/parent/authorizations` & `/dashboard/authorizations`
- Estimated Video Duration: 02:30

### Scene 6.1: Parent Submits Medical Absence Note
- Route: `/dashboard/parent/authorizations`
- Screen Actions:
  1. Click "Submit Absence Request" to open `<NewAuthorizationModal>`.
  2. Select Child: "Dawit Mengistu".
  3. Select Date Range: Today through Tomorrow.
  4. Category: "Medical / Illness".
  5. Reason: "Severe respiratory fever under physician care."
  6. Click "Attach Document": Upload doctor slip `clinic_certificate.pdf`.
  7. Click "Submit Authorization Request". The request appears in the parent tracker as `PENDING`.

### Scene 6.2: Principal Review & Atomic Retroactive Sync
- Route: `/dashboard/authorizations` (Principal View)
- Screen Actions:
  1. The Principal receives the pending authorization in the central inbox without page reload.
  2. Click on the authorization card to view student history, parent statement, and medical document.
  3. Click "Approve Absence".
  4. System Execution Highlight: Demonstrate how the backend automatically searches the database for any `ABSENT` records matching the student during this date window, and retroactively mutates them to `EXCUSED`.
  5. Verify Teacher Attendance Screen: The previously red `ABSENT` marker on Dawit Mengistu is now automatically updated to `EXCUSED` with an audit reference.

### Button & Technical Synchronization Matrix — Act 06

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Submit Absence Request | `/dashboard/parent/authorizations` | Opens `<NewAuthorizationModal>` | Modal state toggle | Local UI state |
| Submit Request | `/dashboard/parent/authorizations` | `POST /api/parent/authorizations` | `prisma.absenceAuthorization.create` | Invalidation: `CACHE_TAGS.SCHOOL_ATTENDANCE` |
| Reject Request | `/dashboard/authorizations` | `PATCH /api/school/authorizations` (status: REJECTED) | `prisma.absenceAuthorization.update` | Rejection notice to parent |
| Approve Absence | `/dashboard/authorizations` | `PATCH /api/school/authorizations` (status: APPROVED) | `prisma.$transaction`: updates authorization + retroactively updates `AttendanceRecord` to `EXCUSED` | `revalidateTag(CACHE_TAGS.SCHOOL_ATTENDANCE)`, Supabase realtime dispatches to teacher and parent views |

---

## Act 07: Academic Engine — AI-Assisted Assessment Builder & Exam Lockout

- Primary Role Persona: Faculty Educator (`TEACHER`)
- Route: `/dashboard/teacher/exams` & `/dashboard/teacher/exams/create`
- Estimated Video Duration: 02:45

### Scene 7.1: AI Assessment Generation
- Route: `/dashboard/teacher/exams/create`
- Visual Focus: Clean, Backlit exam builder canvas with split-pane question editor.
- Screen Actions:
  1. Input Exam Metadata: Title: "Midterm Biology Diagnostic", Subject: "AP Biology", Class: "Grade 10 - Section A".
  2. Click "AI Generate Questions" to open the GenAI extractor drawer.
  3. Enter Topic Prompt: "Cellular Respiration, Glycolysis, and ATP Synthase Mechanisms for Secondary School."
  4. Select Difficulty: "Advanced", Questions: "10 Multiple Choice, 2 Analytical Short Answers".
  5. Click "Extract Structured Questions". The Gemini API engine processes the request inside an isolated prompt sandbox and renders structured, editable question cards into the editor.
  6. Adjust Question Weights: Set question points to sum to 100 total marks.
  7. Toggle "Lockdown Assessment Security": Enforces full-screen requirement, disables copy-paste, and monitors focus-loss events.
  8. Click "Publish Assessment".

### Button & Technical Synchronization Matrix — Act 07

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Create New Exam | `/dashboard/teacher/exams` | Navigates to `/create` | Client navigation | None |
| AI Generate Questions | `/dashboard/teacher/exams/create` | `POST /api/teacher/exams/extract` | Sandboxed Gemini API prompt synthesis | Structured JSON question stream |
| Add Question Manually | `/dashboard/teacher/exams/create` | Client state append | Appends question object to array | Local UI state |
| Save Draft | `/dashboard/teacher/exams/create` | `POST /api/teacher/exams` (published: false) | `prisma.exam.create` | Invalidation: `CACHE_TAGS.GRADES` |
| Publish Assessment | `/dashboard/teacher/exams/[id]/editor` | `PATCH /api/teacher/exams/[id]` (published: true) | `prisma.exam.update({ isPublished: true })` | Realtime event triggers on Student Exam Portal |
| Seal / Lock Exam | `/dashboard/teacher/exams/[id]/editor` | `PATCH /api/teacher/exams/[id]` (locked: true) | `prisma.exam.update({ isLocked: true })` | Blocks future score mutations |

---

## Act 08: The Scholar Room — Resilient Online Assessment & Auto-Scoring

- Primary Role Persona: Scholar / Student (`STUDENT`)
- Route: `/dashboard/student/exams` & `/exam/[id]`
- Estimated Video Duration: 02:30

### Scene 8.1: Student Examination Launchpad
- Route: `/dashboard/student/exams`
- Screen Actions:
  1. Scholar logs in and views the published "Midterm Biology Diagnostic".
  2. The card displays exam duration (60 Minutes), total questions (12), and security status (Lockdown Enabled).
  3. Click "Start Assessment". The system verifies the student session and navigates to the dedicated exam room at `/exam/[id]`.

### Scene 8.2: The Live Exam Room & Offline Resilience
- Route: `/exam/[id]`
- Screen Actions:
  1. The interface locks to full-screen mode. The top bar displays a persistent countdown timer and a cloud sync indicator reading "Cloud Synced".
  2. Answer questions across multiple choice items.
  3. Demonstrate Offline Resilience: Disconnect the network (or toggle offline mode in DevTools). The sync pill transitions to "Local Storage Cached (Offline Safe)". The scholar continues answering without data loss.
  4. Reconnect network: The system reconciles and saves cached responses to PostgreSQL seamlessly.
  5. Answer the final question and click "FINALIZE & SUBMIT ASSESSMENT".
  6. The system calculates objective scores, submits the attempt, creates a `GradeRecord` entry, and displays the preliminary completion score.

### Button & Technical Synchronization Matrix — Act 08

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Start Assessment | `/dashboard/student/exams` | `POST /api/student/exams/start` | `prisma.examAttempt.create({ startedAt: now() })` | Route transition to `/exam/[id]` |
| Language Toggle | `/exam/[id]` | Client language state | Switches English / Amharic labels | Local UI state |
| Next Question | `/exam/[id]` | Client question index | Updates active question node | Local UI state |
| FINALIZE & SUBMIT | `/exam/[id]` | `POST /api/student/exams/submit` | `prisma.gradeRecord.create` + `prisma.examAttempt.update({ status: 'COMPLETED' })` | Invalidation: `CACHE_TAGS.GRADES`, Supabase realtime broadcast to Teacher gradebook |

---

## Act 09: Autonomous Marklists — Continuous Weighted Grading & Sync

- Primary Role Persona: Teacher (`TEACHER`) & Director (`OWNER`)
- Route: `/dashboard/marklist/[id]` & `/dashboard/director/marklist`
- Estimated Video Duration: 02:45

### Scene 9.1: Dynamic Marklist Matrix Spreadsheet
- Route: `/dashboard/marklist/[id]`
- Visual Focus: High-density interactive matrix grid displaying student roster rows against weighted assessment columns.
- Camera Motion: Horizontal tracking shot across columns (Quiz 1: 15%, Homework: 15%, Midterm: 30%, Final: 40%).
- Spoken Narration (Voiceover):
  "End-of-term grading traditionally triggers widespread educator burnout. Spreadsheets with broken formula links lead to grade miscalculations and delayed report cards. LUCY OS replaces manual calculations with autonomous, continuous weighted marklists."

### Scene 9.2: Real-Time Score Entry & 1-Click Gradebook Sync
- Screen Actions:
  1. Click "Configure Column Architecture" in the marklist toolbar.
  2. Define assessment weights: Quiz 1 (15%), Laboratory (15%), Midterm (30%), Final Project (40%). The weight validator displays "100% Normalized - Balanced".
  3. Click "Save Column Architecture".
  4. Type raw scores directly into spreadsheet cells for student "Dawit Mengistu".
  5. Notice the live computation: As raw scores are keyed in, Total Marks, Weighted Percentage, Letter Grade (e.g. "A"), and Class Rank update dynamically on the client without page reload.
  6. Click "SYNC TO GRADEBOOK" in the upper right toolbar.
  7. Select Target Exam: "Term 1 Final Standing".
  8. Click "Execute Scaled Synchronization".
  9. System Execution: Scaled scores are written atomically to `GradeRecord` for all enrolled students. The grades cache is invalidated, propagating to Director oversight dossiers and student report cards.

### Button & Technical Synchronization Matrix — Act 09

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Configure Columns | `/dashboard/marklist/[id]` | Opens Column Drawer | Client drawer toggle | Local UI state |
| Save Architecture | `/dashboard/marklist/[id]` | `POST /api/marklist/config` | `prisma.marklistConfig.upsert` + reconciles column IDs | Invalidation: `CACHE_TAGS.GRADES` |
| Save Score Entry | `/dashboard/marklist/[id]` | `POST /api/marklist/entry` | `prisma.marklistEntry.upsert` | Autosaves raw score per cell |
| SYNC TO GRADEBOOK | `/dashboard/marklist/[id]` | `POST /api/marklist/sync` | Atomic transaction: scales percentages, executes `prisma.gradeRecord.upsert` | Invalidation: `CACHE_TAGS.GRADES`, triggers Supabase `GradeRecord` event |
| Director Approve | `/dashboard/director/marklist` | `PATCH /api/director/marklists/[id]` | `prisma.marklistConfig.update({ isApproved: true })` | Unlocks official report card batch generation |

---

## Act 10: 60-Second Report Cards — Cryptographic Verification & Family Dossiers

- Primary Role Persona: Principal (`PRINCIPAL`), Parent (`PARENT`), & Public Verifier
- Route: `/dashboard/reports`, `/dashboard/reports/[studentId]`, `/verify/student/[studentId]`
- Estimated Video Duration: 02:30

### Scene 10.1: Batch Report Dossier Generation
- Route: `/dashboard/reports`
- Screen Actions:
  1. Principal reviews school-wide academic telemetry: Mean GPA (3.42), Subject Performance curves, and marklist submission completion (100%).
  2. Select Class: "Grade 10 - Section A".
  3. Click "Batch Generate Verified Report Dossiers".
  4. In seconds, the system compiles comprehensive student report cards for all enrolled scholars.

### Scene 10.2: The Official Cryptographic Report Card
- Route: `/dashboard/reports/[studentId]`
- Screen Actions:
  1. Inspect the generated report card for scholar "Dawit Mengistu".
  2. Review the layout: High-contrast school crest, accredited registration number, student portrait, attendance statistics, subject grade matrix, teacher remarks, and cumulative GPA.
  3. Focus on the tamper-proof security stamp: A cryptographic QR verification badge embedded in the footer.
  4. Click "Download Official PDF". The system renders a crisp vector document via client-side PDF synthesis.

### Scene 10.3: Public QR Verification Scan
- Route: `/verify/student/[studentId]`
- Screen Actions:
  1. Scan the QR code using a mobile device or navigate directly to the verification URL.
  2. The public credential verification portal loads instantly without requiring login credentials.
  3. The screen displays: Verified Student Identity, Active Enrollment Status, Issuing Institution ("Apex International Academy"), and Cryptographic Signature Hash, confirming zero document forgery.

### Button & Technical Synchronization Matrix — Act 10

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Batch Generate Reports | `/dashboard/reports` | Client PDF batch queue | Batch compiles student GPA and grade records | In-memory document generation |
| Download Official PDF | `/dashboard/reports/[studentId]` | Client vector PDF export | `jspdf` vector document compilation | Direct browser download |
| Print Report Dossier | `/dashboard/reports/[studentId]` | `window.print()` | Native browser print dialog | Formatted print CSS media query |
| Public QR Verify | `/verify/student/[studentId]` | Public route access | `prisma.student.findUnique` with verified school data | Zero auth required; tamper-proof proof |

---

## Act 11: Tuition Settlement — Mobile Gateway Reconciliation & Financial Ledger

- Primary Role Persona: School Owner (`OWNER`) & Parent (`PARENT`)
- Route: `/dashboard/finance`, `/dashboard/finance/students`, `/dashboard/parent`
- Estimated Video Duration: 02:45

### Scene 11.1: The Executive Financial Dashboard
- Route: `/dashboard/finance`
- Visual Focus: Executive cash-flow dashboard featuring gross tuition billed, verified receipts, outstanding arrears, collection velocity curves, and bank gateway distribution.
- Camera Motion: Slow pan across the revenue telemetry widgets.
- Spoken Narration (Voiceover):
  "Tuition leakage and delayed fee reconciliation cripple private educational institutions. Unverified bank slips and cash handling errors create massive operational friction. LUCY OS maintains an immutable, double-entry financial ledger integrated directly with domestic and international payment gateways."

### Scene 11.2: Fee Provisioning & Invoice Issuance
- Screen Actions:
  1. Click "Create Fee Structure" to open the `<CreateFeeModal>`.
  2. Configure: Name: "Grade 10 Semester 1 Tuition", Amount: 24,500 ETB, Term: "Semester 1".
  3. Click "Save Fee Structure".
  4. Click "Batch Issue Invoices to Enrolled Scholars". The system provisions invoice records across all enrolled students in the cohort.

### Scene 11.3: Parent Digital Checkout & Instant Ledger Reconciliation
- Route: `/dashboard/parent` -> Pay Tuition Modal
- Screen Actions:
  1. Parent logs in, sees outstanding balance of 24,500 ETB, and clicks "Pay Outstanding Tuition".
  2. Payment Gateway Options: Selects "Telebirr / CBE Birr".
  3. Parent inputs mobile checkout reference and confirms settlement.
  4. Webhook Demonstration: The payment gateway webhook fires at `/api/webhooks/telebirr`.
  5. The transaction updates `Payment.status = 'SUCCESS'`, marks the `Invoice.status = 'PAID'`, generates an immutable `BillingReceipt`, and recalculates executive cash-flow metrics.
  6. Return to Director Finance Screen (`/dashboard/finance`): Outstanding arrears decrease by 24,500 ETB and verified cash collections increase immediately without page refresh.

### Button & Technical Synchronization Matrix — Act 11

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Create Fee Structure | `/dashboard/finance` | `POST /api/school/finance/fees` | `prisma.feeStructure.create` | Invalidation: `CACHE_TAGS.FINANCE` |
| Issue Batch Invoices | `/dashboard/finance` | `POST /api/school/finance/invoices` | `prisma.invoice.createMany` | Realtime event triggers on Parent portals |
| Pay Outstanding Tuition | `/dashboard/parent` | Opens Payment Modal | Client modal toggle | Local UI state |
| Submit Payment | `/dashboard/parent` | `POST /api/school/finance/pay` | `prisma.payment.create` + `prisma.invoice.update({ status: 'PAID' })` | Invalidation: `CACHE_TAGS.FINANCE`, updates Director revenue |
| Record Cash Receipt | `/dashboard/finance/students` | `POST /api/school/finance/pay` (cash) | `prisma.payment.create` with manual cashier reference | Generates printable `BillingReceipt` |

---

## Act 12: System Defense & The Sanctuary — Governance & Student Safety

- Primary Role Persona: Principal (`PRINCIPAL`), School Owner (`OWNER`), Student (`STUDENT`), & SuperAdmin (`SUPERADMIN`)
- Route: `/dashboard/approvals`, `/dashboard/sanctuary`, `/admin/sanctuary`
- Estimated Video Duration: 03:00

### Scene 12.1: High-Risk Destructive Governance & Cryptographic Approval Queue
- Route: `/dashboard/students` & `/dashboard/approvals`
- Visual Focus: Zero-trust deletion safeguards protecting institutional data integrity.
- Screen Actions:
  1. Principal attempts to delete an enrolled student or faculty member.
  2. System Guardrail: The UI blocks instant execution and opens the `<ActionRequestModal>`.
  3. Principal inputs justification: "Transferred to international boarding academy."
  4. Click "Submit for Owner Authorization".
  5. School Owner logs in and navigates to `/dashboard/approvals`.
  6. Owner reviews: Requester Identity, Action Type (`DELETE_STUDENT`), Target Scholar, Justification, and Timestamp.
  7. Click "Authorize & Execute Mutation".
  8. System Execution: The deletion executes atomically inside PostgreSQL, student auth credentials are revoked, cache tags are invalidated, and a non-null `schoolId` audit record is permanently written.

### Scene 12.2: The Sanctuary — Anonymous Peer Support Network
- Route: `/dashboard/sanctuary` (Student View)
- Visual Focus: Calming, distraction-free confidential interface designed for secondary scholars (Grades 7 through 12).
- Screen Actions:
  1. Scholar in Grade 10 clicks "Enter Secure Uplink".
  2. System Matchmaking: The matching engine pairs two scholars anonymously across schools, assigning pseudonyms "Indigo Sparrow" and "Amber Falcon". Real names, grades, and school affiliations remain completely concealed.
  3. Anti-Doxxing Interceptor Demo: Scholar attempts to type a personal phone number ("Call me at 0911223344") or social handle ("@dawit_m").
  4. Real-Time PII Shield: The client and server interceptors strip the contact information instantly, displaying `[PHONE_REDACTED]` and warning the student of safety protocols.
  5. Anti-Screenshot Defense: Demonstrate pressing the PrintScreen or Cmd+Shift+4 keys. The UI detects the key combination and renders a privacy shield overlay warning against unauthorized capture.
  6. Panic Exit: Press the "Escape" key or click the red "Panic Exit" button. The session is dissolved instantly, chat memory is wiped, and the browser redirects to the student home dashboard.

### Scene 12.3: SuperAdmin Safety Moderation Console
- Route: `/admin/sanctuary` (SuperAdmin View)
- Visual Focus: Real-time telemetry monitoring flagged safety intercepts and crisis keywords.
- Screen Actions:
  1. SuperAdmin opens the moderation console.
  2. Inspect the Flagged Session Queue: A session flagged for crisis expressions appears in the queue.
  3. Click to open the Interactive Transcript Scrubber.
  4. SuperAdmin clicks "Dispatch Guidance Counselor". The student's confidential token is securely linked to accredited institutional wellness staff, ensuring rapid human intervention without exposing the student to public peer ridicule.

### Button & Technical Synchronization Matrix — Act 12

| UI Button Label | Route / Component | Target API / Trigger | DB Mutation / Engine | Cache & Realtime Effect |
| :--- | :--- | :--- | :--- | :--- |
| Request Deletion | `/dashboard/students` | `POST /api/school/approvals` | `prisma.actionRequest.create({ status: 'PENDING' })` | Appears in Owner Approval Queue |
| Authorize Mutation | `/dashboard/approvals` | `POST /api/school/approvals/resolve` (APPROVED) | `prisma.$transaction`: executes deletion payload + `logActivity` audit log | Invalidation: `CACHE_TAGS.STUDENTS` / `CACHE_TAGS.USER_PROFILE` |
| Reject Request | `/dashboard/approvals` | `POST /api/school/approvals/resolve` (REJECTED) | `prisma.actionRequest.update({ status: 'REJECTED' })` | Rejection logged to audit trail |
| Enter Secure Uplink | `/dashboard/sanctuary` | `POST /api/sanctuary/match` | `prisma.sanctuarySession.create` with pseudonyms | Pairs eligible Grade 7–12 students |
| Send Message | `/dashboard/sanctuary` | `POST /api/sanctuary/message` | PII de-obfuscation filter + inserts `SanctuaryMessage` | Live ephemeral chat stream |
| Panic Exit | `/dashboard/sanctuary` | `POST /api/sanctuary/end` + Router push | Dissolves session memory + terminates active socket | Immediate redirect to `/dashboard/student` |
| Dispatch Counselor | `/admin/sanctuary` | `POST /api/sanctuary/moderation/action` (COUNSELOR) | Links crisis session to verified school counselor | Escalates safety protocol |
| Terminate Session | `/admin/sanctuary` | `POST /api/sanctuary/moderation/action` (TERMINATE) | Forces session termination with audit log | Dissolves student socket connection |

---

## Complete 107-Page Application Directory & Real-Time Synchronization Matrix

This section catalogs all 107 active pages in the LUCY OS application, documenting what each page does, its primary interactive buttons, target API endpoints, database mutations, and how changes synchronize in real time across roles.

### 1. Public Marketing, Legal & Presentation Pages (25 Pages)

#### 001. Institutional Landing Page
- Route: `/` (`app/page.tsx`)
- Role Access: Public (Unauthenticated)
- Purpose: Primary public brand surface, platform positioning, Backlit aesthetic showcase, interactive particle physics, and entry point for institutional trials.
- Primary Buttons & Actions:
  - "Get Started" / "Start 4-Month Trial": Redirects to `/register`.
  - "Sign In": Navigates to central login `/login`.
  - "Explore Architecture": Navigates to `/features`.
  - "Keynote Presentation": Opens `/deck`.
- Synchronization: Static landing page; navbar detects active session cookies and renders dynamic "Dashboard" button if authenticated.

#### 002. Executive Keynote Presentation Deck
- Route: `/deck` (`app/deck/page.tsx`)
- Role Access: Public
- Purpose: 10-Act interactive stage keynote presentation with 16:9 widescreen layout, auto-play presenter mode, and client-side slide export engines.
- Primary Buttons & Actions:
  - "Projector Mode" (Hotkey F): Fullscreen stage canvas toggle.
  - "Auto-Play": Automatically advances slides every 8 seconds.
  - "PPTX Export": Compiles and downloads `LUCY_OS_Keynote_Presentation.pptx` with embedded speaker notes.
  - "PDF Export": Compiles and downloads `LUCY_OS_Keynote_Presentation.pdf` vector slides.
- Synchronization: Client-side vector rendering and binary synthesis.

#### 003. Platform Documentation
- Route: `/docs` (`app/docs/page.tsx`)
- Role Access: Public
- Purpose: Comprehensive institutional user manual, setup guides, and architectural documentation.
- Primary Buttons: "Copy Code Snippet", "Download PDF Manual", "Search Documentation".
- Synchronization: Static content with client-side full-text search.

#### 004. About LUCY OS
- Route: `/about` (`app/about/page.tsx`)
- Role Access: Public
- Purpose: Founding vision, engineering principles, and autonomous campus operations manifesto.
- Primary Buttons: "Meet Leadership", "Contact Engineering Team".
- Synchronization: Static page.

#### 005. Platform Feature Directory
- Route: `/features` (`app/features/page.tsx`)
- Role Access: Public
- Purpose: Detailed capability breakdown of the 7 core engines: Academic, Financial, Timetable, Attendance, Governance, Family, and Sanctuary.
- Primary Buttons: "Request Live Demonstration", "Compare with Legacy Systems".
- Synchronization: Static page.

#### 006. Institutional Pricing & 4-Month Trial
- Route: `/pricing` (`app/pricing/page.tsx`)
- Role Access: Public
- Purpose: Transparent per-student institutional licensing tiers, pilot conditions, and payment methods (CBE, Telebirr, Stripe).
- Primary Buttons: "Claim 4-Month Free Trial" (navigates to `/register`), "Contact Enterprise Sales".
- Synchronization: Static pricing calculator with interactive student slider.

#### 007. Contact & Institutional Sales
- Route: `/contact` (`app/contact/page.tsx`)
- Role Access: Public
- Purpose: Institutional inquiry submission and pilot scheduling form.
- Primary Buttons: "Submit Inquiry" (`POST /api/public/contact`).
- Synchronization: Writes to `Inquiry` in DB; dispatches notification email to platform administrators.

#### 008. Campus Community Hub
- Route: `/community` (`app/community/page.tsx`)
- Role Access: Public
- Purpose: Educator forum links, Discord community channels, and Telegram institutional updates.
- Primary Buttons: "Join Discord Server", "Subscribe to Telegram Broadcast".
- Synchronization: External community links.

#### 009. Academic Engineering Blog
- Route: `/blog` (`app/blog/page.tsx`)
- Role Access: Public
- Purpose: Technical write-ups, pedagogical case studies, and modern campus automation benchmarks.
- Primary Buttons: "Read Article", "Filter by Category".
- Synchronization: Dynamic article list sourced from Markdown repository.

#### 010. Platform Changelog
- Route: `/changelog` (`app/changelog/page.tsx`)
- Role Access: Public
- Purpose: Version history, security patch updates, and feature rollout logs.
- Primary Buttons: "Subscribe to Release Notes", "Inspect Commit Log".
- Synchronization: Static release timeline.

#### 011. Product Roadmap
- Route: `/roadmap` (`app/roadmap/page.tsx`)
- Role Access: Public
- Purpose: Forward-looking quarterly feature roadmap and voter submission for requested modules.
- Primary Buttons: "Upvote Feature", "Submit Proposal".
- Synchronization: User vote updates database counter in real time.

#### 012. Security Architecture Whitepaper
- Route: `/security` (`app/security/page.tsx`)
- Role Access: Public
- Purpose: Zero-trust architecture specifications, cryptographic audit standards, FERPA, GDPR, and EDPP compliance guidelines.
- Primary Buttons: "Download SOC-2 Whitepaper", "Report Security Vulnerability" (`POST /api/public/security-report`).
- Synchronization: Static compliance documentation.

#### 013. Privacy Policy
- Route: `/privacy` (`app/privacy/page.tsx`)
- Role Access: Public
- Purpose: Comprehensive student and institutional privacy disclosures and data retention rules.
- Primary Buttons: "Print Policy", "Download PDF".
- Synchronization: Static policy document.

#### 014. Terms of Institutional Service
- Route: `/terms` (`app/terms/page.tsx`)
- Role Access: Public
- Purpose: Legal terms governing campus licenses, uptime commitments, and tenant obligations.
- Primary Buttons: "Accept Terms", "Print Terms".
- Synchronization: Static legal document.

#### 015. Service Level Agreement (SLA)
- Route: `/sla` (`app/sla/page.tsx`)
- Role Access: Public
- Purpose: Official 99.9% uptime guarantees, error budget metrics, and severity response tiers.
- Primary Buttons: "Download SLA Contract".
- Synchronization: Static legal document.

#### 016. Data Processing Addendum (DPA)
- Route: `/dpa` (`app/dpa/page.tsx`)
- Role Access: Public
- Purpose: Multi-tenant data residency, sub-processor disclosures, and data protection terms.
- Primary Buttons: "Download DPA Document".
- Synchronization: Static legal document.

#### 017. Master Services Agreement (MSA)
- Route: `/msa` (`app/msa/page.tsx`)
- Role Access: Public
- Purpose: Enterprise contract terms for multi-campus networks and ministry-level deployments.
- Primary Buttons: "Download Master Agreement".
- Synchronization: Static legal document.

#### 018. Live Systems Status
- Route: `/status` (`app/status/page.tsx`)
- Role Access: Public
- Purpose: Real-time telemetry monitoring edge nodes, database clusters, auth gateways, and background queue workers.
- Primary Buttons: "Subscribe to Incident Alerts", "View Historical Uptime".
- Synchronization: Fetches live health checks from `/api/public/health`.

#### 019. Institutional Support Desk
- Route: `/support` (`app/support/page.tsx`)
- Role Access: Public / Authenticated
- Purpose: Help ticket submission, live chat support uplink, and institutional onboarding guide.
- Primary Buttons: "Submit Support Ticket", "Launch Knowledgebase".
- Synchronization: Creates support ticket record; routes to SuperAdmin triage.

#### 020. Cyber Insurance & Indemnity
- Route: `/insurance` (`app/insurance/page.tsx`)
- Role Access: Public
- Purpose: Details institutional cyber insurance coverage and automated disaster recovery indemnity.
- Primary Buttons: "Inspect Certificate of Coverage".
- Synchronization: Static compliance document.

#### 021. Global Campus Network
- Route: `/network` (`app/network/page.tsx`)
- Role Access: Public
- Purpose: Interactive 3D globe visualization showing active accredited academies running LUCY OS.
- Primary Buttons: "Inspect Campus Node", "Filter by Region".
- Synchronization: Three.js/WebGL interactive simulation.

#### 022. Wall of Fame & Institutional Testimonials
- Route: `/wall` (`app/wall/page.tsx`)
- Role Access: Public
- Purpose: Verified quotes, case studies, and efficiency metrics from partnered school owners.
- Primary Buttons: "Submit School Review", "Filter by Academy Tier".
- Synchronization: Paginated review list.

#### 023. Autonomous AI Intelligence Center
- Route: `/intelligence` (`app/intelligence/page.tsx`)
- Role Access: Public
- Purpose: Showcase of the autonomous AI evaluation sandbox, anti-injection firewall, and grading algorithms.
- Primary Buttons: "Test Sandbox Evaluator", "Inspect Prompt Guardrails".
- Synchronization: Static technical documentation.

#### 024. Certified Schools Directory
- Route: `/schools` (`app/schools/page.tsx`)
- Role Access: Public
- Purpose: Public directory of certified educational institutions using LUCY OS.
- Primary Buttons: "Search School by Code", "Verify Accreditation".
- Synchronization: Reads published `School` records from database.

#### 025. Tenant Suspension Notice
- Route: `/school-suspended` (`app/school-suspended/page.tsx`)
- Role Access: Public (Redirect Target)
- Purpose: Displayed when an institution is suspended by SuperAdmin due to billing lapse or policy violation.
- Primary Buttons: "Contact Administration", "Submit Payment Receipt".
- Synchronization: Edge Middleware intercepts all tenant requests and redirects here when `School.status === 'SUSPENDED'`.

---

### 2. Authentication, Identity & Onboarding Pages (10 Pages)

#### 026. Central Login Portal
- Route: `/login` (`app/login/page.tsx`)
- Role Access: Public
- Purpose: Central authentication gateway for all 7 roles with Supabase SSR session issuance and role-based redirect routing.
- Primary Buttons: "Sign In" (`POST /api/auth/login`), "Forgot Password" link, "Create School Account" link.
- Synchronization: Issues encrypted JWT session cookies; Edge Middleware redirects users to `/admin/dashboard`, `/dashboard`, `/dashboard/teacher`, `/dashboard/parent`, or `/dashboard/student` based on user role.

#### 027. Session Logout
- Route: `/logout` (`app/logout/page.tsx`)
- Role Access: Authenticated
- Purpose: Terminates active Supabase auth session, flushes client state, and invalidates server-side cookies.
- Primary Buttons: Automatically executes logout on mount or on confirmation.
- Synchronization: Supabase auth session cleared; redirected to `/login`.

#### 028. School Owner Registration (4-Month Trial)
- Route: `/register` (`app/register/page.tsx`)
- Role Access: Public
- Purpose: Self-service onboarding for new academies, provisioning school tenant, owner profile, and default academic calendar.
- Primary Buttons: "Launch Institutional Trial" (`POST /api/auth/register-admin`).
- Synchronization: Atomically creates `School`, `User` (`OWNER`), `AcademicTerm`; logs audit event; redirects to `/dashboard`.

#### 029. Staff & Administrator Invite Registration
- Route: `/register/admin` (`app/register/admin/page.tsx`)
- Role Access: Token-Verified
- Purpose: Onboarding portal for invited administrative staff members holding a cryptographic invite token.
- Primary Buttons: "Activate Administrator Profile" (`POST /api/auth/register-admin`).
- Synchronization: Binds user profile to target `schoolId`; consumes `InviteToken`.

#### 030. School Director Provisioning Portal
- Route: `/register/director` (`app/register/director/page.tsx`)
- Role Access: Token-Verified
- Purpose: Executive registration portal for newly assigned school directors and institutional principals.
- Primary Buttons: "Confirm Executive Credentials" (`POST /api/auth/register-admin`).
- Synchronization: Sets role to `OWNER` or `PRINCIPAL`; scopes permissions to target school.

#### 031. Parent Self-Registration Portal
- Route: `/register/parent` (`app/register/parent/page.tsx`)
- Role Access: Public
- Purpose: Allows parents to create an account, verify phone/email, and prepare for student pairing.
- Primary Buttons: "Create Parent Account" (`POST /api/auth/register/parent`).
- Synchronization: Creates `User` with role `PARENT`; redirects to `/dashboard/parent` to link children.

#### 032. Scholar Account Activation Portal
- Route: `/register/student` (`app/register/student/page.tsx`)
- Role Access: Public / Student Code Verified
- Purpose: Allows enrolled students to claim their digital portal by verifying their official student badge code.
- Primary Buttons: "Verify Student Code & Activate" (`POST /api/auth/register/student`).
- Synchronization: Binds student profile to new login credentials; sets role `STUDENT`.

#### 033. Forgot Password Request
- Route: `/forgot-password` (`app/forgot-password/page.tsx`)
- Role Access: Public
- Purpose: Dispatches rate-limited cryptographic password recovery emails via Supabase Auth.
- Primary Buttons: "Send Recovery Link" (`POST /api/auth/forgot-password`).
- Synchronization: Creates token in Supabase Auth; logs auth audit event.

#### 034. Password Reset Form
- Route: `/reset-password` (`app/reset-password/page.tsx`)
- Role Access: Token-Verified
- Purpose: Secure form where user inputs and confirms new password after opening reset link.
- Primary Buttons: "Update Password & Sign In" (`PATCH /api/user/password`).
- Synchronization: Updates password hash in Supabase and Prisma; revokes all existing sessions.

#### 035. Cryptographic Invite Acceptance
- Route: `/invite/[token]` (`app/invite/[token]/page.tsx`)
- Role Access: Public (Token-Verified)
- Purpose: Validates signed invite tokens for teachers and staff, pre-filling email and assigned role.
- Primary Buttons: "Complete Profile & Join Faculty".
- Synchronization: Validates token expiration; creates active `User` record; invalidates `CACHE_TAGS.TEACHERS`.

---

### 3. Public Verification & Standalone Examination Pages (2 Pages)

#### 036. Tamper-Proof Public Student Verification
- Route: `/verify/student/[studentId]` (`app/verify/student/[studentId]/page.tsx`)
- Role Access: Public (Zero Login Required)
- Purpose: Destination for scanning QR codes on official student ID badges and report cards, providing instant cryptographic verification of student identity, active enrollment status, and school accreditation.
- Primary Buttons: "Verify Official Record", "Print Verified Transcript".
- Synchronization: Reads live from PostgreSQL; tamper-proof proof against forged paper credentials.

#### 037. Dedicated Live Examination Room
- Route: `/exam/[id]` (`app/exam/[id]/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Fullscreen, distraction-free assessment environment featuring offline `localStorage` caching, real-time countdown timer, language toggle (English/Amharic), and instant auto-grading.
- Primary Buttons:
  - "Language Toggle": Switches interface between English and Amharic.
  - "Next / Previous Question": Advances question view.
  - "FINALIZE & SUBMIT ASSESSMENT": Submits student answers (`POST /api/student/exams/submit`).
- Synchronization: Calculates score, inserts `GradeRecord`, updates `ExamAttempt.status = 'COMPLETED'`, triggers realtime broadcast to Teacher gradebook.

---

### 4. SuperAdmin Control Center (7 Pages)

#### 038. SuperAdmin Global Command Center
- Route: `/admin/dashboard` (`app/admin/dashboard/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Central telemetry hub displaying platform-wide health metrics: total active institutions, scholar headcount, faculty count, aggregate tuition volume, and edge latency.
- Primary Buttons: "Refresh Telemetry", "Inspect Edge Health", "Trigger Global Backup".
- Synchronization: Aggregates metrics across all tenant databases; real-time system monitoring.

#### 039. Multi-Tenant School Directory & Provisioning
- Route: `/admin/schools` (`app/admin/schools/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Manages all campus tenants, provisions new institutions, and enforces instantaneous platform-wide suspensions.
- Primary Buttons:
  - "Provision Institution": Opens `<CreateSchoolModal>` (`POST /api/admin/schools`).
  - "Suspend / Activate Switch": Toggles school operational state (`PATCH /api/admin/schools/[id]/status`).
  - "Inspect Campus Telemetry": Opens deep tenant telemetry dossier.
- Synchronization: Tenant suspension immediately revokes sessions via Next.js Edge Middleware.

#### 040. Platform Billing Receipts & Subscription Management
- Route: `/admin/billing` (`app/admin/billing/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Reviews pending offline bank deposits (Commercial Bank of Ethiopia, Telebirr, cash vouchers), assigns subscription tiers, and monitors Stripe subscription webhooks.
- Primary Buttons: "Approve Deposit Slip" (`POST /api/admin/billing/verify`), "Reject Deposit Slip", "Extend Trial Term".
- Synchronization: Updates `BillingReceipt.status = 'APPROVED'`; extends `School` subscription active term.

#### 041. Cross-Campus Sanctuary Telemetry & Safety Moderation
- Route: `/admin/sanctuary` (`app/admin/sanctuary/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Platform-wide moderation console for The Sanctuary peer support network, displaying active sessions, topology distributions, and flagged safety intercepts.
- Primary Buttons:
  - "Filter by Threat Severity": Toggles between All, Crisis, and Doxxing.
  - "Interactive Transcript Scrubber": Opens de-obfuscated transcript with flagged terms highlighted.
  - "Dispatch Counselor": Safely routes student to verified school wellness faculty (`POST /api/sanctuary/moderation/action`).
  - "Terminate Session": Dissolves session instantly (`POST /api/sanctuary/moderation/action`).
  - "Dismiss Report": Archives false positive.
- Synchronization: Real-time socket updates notify console of new flagged conversations immediately.

#### 042. Edge Security & Firewall Telemetry
- Route: `/admin/security` (`app/admin/security/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Live firewall telemetry, brute-force rate-limit counters (`AuthRateLimit`), IP blacklisting controls, and CSRF telemetry.
- Primary Buttons: "Ban IP Address" (`POST /api/admin/security/ban`), "Flush Rate Limit Counter", "Purge Edge Cache".
- Synchronization: Updates Redis/in-memory rate limiters across edge nodes.

#### 043. Unified Platform Error Logs & Crash Dumps
- Route: `/admin/logs` (`app/admin/logs/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Centralized diagnostic stream displaying unhandled exceptions (`ErrorLog`), UI crash dumps, and immutable institutional audit records (`AuditLog`).
- Primary Buttons: "Filter by Severity", "Clear Resolved Errors", "Export Audit Trail (CSV)".
- Synchronization: Real-time structured log streaming.

#### 044. Institutional Onboarding Requests & Demo Inquiries
- Route: `/admin/requests` (`app/admin/requests/page.tsx`)
- Role Access: `SUPERADMIN`
- Purpose: Reviews institutional onboarding applications and demo requests submitted via public forms.
- Primary Buttons: "Approve Application & Dispatch Invite", "Archive Request", "Schedule Live Demo".
- Synchronization: Generates signed invite token; dispatches onboarding email to school owner.

---

### 5. Executive, Financial & School Administration Portal (42 Pages)

#### 045. Institutional Command Center
- Route: `/dashboard` (`app/dashboard/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `HOMEROOM`, `TEACHER`
- Purpose: Master institutional overview displaying active student count, faculty roster size, daily attendance percentage, and quick action launchpad.
- Primary Buttons: "Enroll Student", "Conduct Roll Call", "Create Assessment", "View Financial Pulse".
- Synchronization: Subscribes to `realtime-dashboard-${schoolId}`; auto-refreshes on attendance, grade, or invoice mutations.

#### 046. Campus AI Intelligence Center
- Route: `/dashboard/ai` (`app/dashboard/ai/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Administrative AI dashboard for syllabus auditing, institutional performance predictions, and automated policy synthesis.
- Primary Buttons: "Analyze Curriculum Alignment", "Predict Term Dropout Risk", "Generate Board Report".
- Synchronization: Invokes sandboxed GenAI analytics API.

#### 047. Cryptographic High-Risk Action Approval Queue
- Route: `/dashboard/approvals` (`app/dashboard/approvals/page.tsx`)
- Role Access: `OWNER`
- Purpose: Zero-trust governance inbox where the school owner reviews and cryptographically authorizes destructive actions (staff terminations, student expulsions, marklist purges) initiated by principals.
- Primary Buttons:
  - "Authorize & Execute Mutation": Atomically executes action (`POST /api/school/approvals/resolve` with `APPROVED`).
  - "Reject Request": Rejects destructive action (`POST /api/school/approvals/resolve` with `REJECTED`).
- Synchronization: Atomically deletes target entity, purges Auth credentials, logs mandatory audit record, and invalidates affected cache tags.

#### 048. Central Assignments Management
- Route: `/dashboard/assignments` (`app/dashboard/assignments/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`
- Purpose: Campus-wide coursework directory showing assignment completion ratios, submission counts, and grading progress.
- Primary Buttons: "Create Assignment", "Filter by Grade / Subject", "Batch Download Submissions".
- Synchronization: `CACHE_TAGS.ASSIGNMENTS` invalidation; updates student homework trackers in real time.

#### 049. Attendance Rules & Late Arrival Settings
- Route: `/dashboard/attendance/settings` (`app/dashboard/attendance/settings/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Configures institutional attendance policies, morning bell late cutoffs (e.g. 8:30 AM), automatic absence thresholds, and parent notification rules.
- Primary Buttons: "Save Attendance Policies" (`PATCH /api/school/attendance/settings`), "Reset to Defaults".
- Synchronization: Invalidation: `CACHE_TAGS.SCHOOL_ATTENDANCE`.

#### 050. Absence Excuse Approval Inbox
- Route: `/dashboard/authorizations` (`app/dashboard/authorizations/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Central inbox where principals review parent-submitted absence excuses and medical slips.
- Primary Buttons:
  - "Approve Absence": Approves leave and retroactively updates `ABSENT` records to `EXCUSED` (`PATCH /api/school/authorizations`).
  - "Reject Absence": Rejects excuse request.
- Synchronization: Atomic transaction retroactively mutates `AttendanceRecord`, invalidates `CACHE_TAGS.SCHOOL_ATTENDANCE`, dispatches realtime update to teacher roll call.

#### 051. Campus Subscription & License Management
- Route: `/dashboard/billing` (`app/dashboard/billing/page.tsx`)
- Role Access: `OWNER`
- Purpose: School owner subscription portal showing active plan tier, expiration countdown, student license utilization, and bank transfer instructions.
- Primary Buttons: "Upload Bank Deposit Slip" (`POST /api/school/billing/receipt`), "Upgrade Plan Tier".
- Synchronization: Submits receipt for SuperAdmin approval; invalidates school billing status on approval.

#### 052. Curriculum Library & Textbook Management
- Route: `/dashboard/books` (`app/dashboard/books/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`
- Purpose: Central repository of digital textbooks, curriculum units, and physical library book checkout registers.
- Primary Buttons: "Upload Digital Curriculum (PDF)", "Log Book Checkout", "Return Book".
- Synchronization: Updates book checkout inventory and student profile records.

#### 053. Class & Grade Hierarchy Manager
- Route: `/dashboard/classes` (`app/dashboard/classes/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Defines academic grades (Grade 1 to 12) and subdivides them into class sections (Section A, B, C) with assigned homeroom teachers and room capacities.
- Primary Buttons: "Create Grade Level", "Add Class Section" (`POST /api/school/classes`), "Assign Homeroom Teacher".
- Synchronization: Invalidation: `CACHE_TAGS.CLASSES`; live refresh across student and teacher directories.

#### 054. Director Campus-Wide Attendance Telemetry
- Route: `/dashboard/director/attendance` (`app/dashboard/director/attendance/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Executive heatmap showing staff clock-in compliance, student presence ratios across grade levels, and chronic absenteeism flags.
- Primary Buttons: "Export Monthly Register (CSV)", "Filter by Department", "Send Campus Absence Alert".
- Synchronization: Real-time attendance aggregations updated via Supabase channel.

#### 055. Director Academic Marklist Compliance
- Route: `/dashboard/director/marklist` (`app/dashboard/director/marklist/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Executive oversight of teacher grading progress across all classes and subjects, grade distribution curves, and term publishing approvals.
- Primary Buttons: "Approve Class Marklist" (`PATCH /api/director/marklists/[id]`), "Lock All Final Term Grades", "Batch Generate Report Cards".
- Synchronization: Unlocks official report card generation; invalidates `CACHE_TAGS.GRADES`.

#### 056. Multi-Subject Marklist Initialization Wizard
- Route: `/dashboard/director/marklist/create` (`app/dashboard/director/marklist/create/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Central wizard to initialize synchronized marklists across multiple subjects and sections simultaneously.
- Primary Buttons: "Initialize Marklist Matrix" (`POST /api/marklist/config`).
- Synchronization: Creates `MarklistConfig` records for assigned teachers.

#### 057. Institutional Calendar & Term Events
- Route: `/dashboard/events` (`app/dashboard/events/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`
- Purpose: School master calendar scheduling term start/end dates, examination windows, sports days, and public holidays.
- Primary Buttons: "Create Campus Event" (`POST /api/school/events`), "Sync to Google Calendar".
- Synchronization: Real-time event notifications broadcast to teachers, parents, and students.

#### 058. Executive Financial Dashboard
- Route: `/dashboard/finance` (`app/dashboard/finance/page.tsx`)
- Role Access: `OWNER`
- Purpose: Executive financial overview showing gross tuition billed, verified receipts, outstanding arrears, collection velocity curves, and bank gateway reconciliation.
- Primary Buttons: "Create Fee Structure" (`POST /api/school/finance/fees`), "Issue Batch Invoices", "Export General Ledger".
- Synchronization: Invalidation: `CACHE_TAGS.FINANCE`; real-time cashflow telemetry.

#### 059. Staff Payroll & Salary Disbursements
- Route: `/dashboard/finance/payroll` (`app/dashboard/finance/payroll/page.tsx`)
- Role Access: `OWNER`
- Purpose: Calculates faculty salaries, hourly rates, tax withholdings, bonuses, and records disbursement receipts.
- Primary Buttons: "Calculate Monthly Payroll", "Execute Salary Disbursement" (`POST /api/school/finance/payroll`), "Print Payslips".
- Synchronization: Logs payment mutations; updates operational expenditure totals.

#### 060. Revenue Telemetry & Gateway Reconciliation
- Route: `/dashboard/finance/revenue` (`app/dashboard/finance/revenue/page.tsx`)
- Role Access: `OWNER`
- Purpose: Deep breakdown of tuition cash inflows segmented by gateway: Telebirr, CBE Birr, Stripe, and Cashiers.
- Primary Buttons: "Reconcile Bank Statement", "Filter by Date Range", "Export Revenue Audit (CSV)".
- Synchronization: Real-time ledger updates as webhooks settle payments.

#### 061. Student Tuition Dossiers & Invoice Ledger
- Route: `/dashboard/finance/students` (`app/dashboard/finance/students/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Comprehensive directory of all student billing accounts, tuition invoices, paid balances, and payment history.
- Primary Buttons:
  - "Record Cash / Bank Payment": Opens `<RecordPaymentModal>` (`POST /api/school/finance/pay`).
  - "Apply Fee Waiver / Scholarship": Grants discount.
  - "Issue Statement of Account": Downloads financial statement PDF.
- Synchronization: Invalidation: `CACHE_TAGS.FINANCE`; parent portal updates immediately.

#### 062. In-App Knowledgebase & Support Center
- Route: `/dashboard/help` (`app/dashboard/help/page.tsx`)
- Role Access: Authenticated (All Roles)
- Purpose: Interactive walkthroughs, video tutorials, keyboard shortcut guides, and operational playbooks.
- Primary Buttons: "Search Knowledgebase", "Open Guided Tour", "Contact Campus Administrator".
- Synchronization: Static guide content.

#### 063. Homeroom Educator Command Center
- Route: `/dashboard/homeroom` (`app/dashboard/homeroom/page.tsx`)
- Role Access: `HOMEROOM`, `PRINCIPAL`, `OWNER`
- Purpose: Dedicated command center for homeroom teachers managing a specific cohort: daily attendance aggregation, student alerts, and parent communication links.
- Primary Buttons: "Conduct Class Roll Call", "View Class GPA Summary", "Message All Cohort Parents".
- Synchronization: Scoped to assigned class; auto-updates when subject teachers submit grades.

#### 064. Academic Marklists Directory
- Route: `/dashboard/marklist` (`app/dashboard/marklist/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`, `HOMEROOM`
- Purpose: Directory of all academic marklists for the active term, filterable by grade, section, subject, and submission status.
- Primary Buttons: "Open Marklist Spreadsheet", "Create New Marklist", "Export All Marklists".
- Synchronization: Scoped by teacher assignments or full school permissions.

#### 065. Fullscreen Weighted Marklist Spreadsheet
- Route: `/dashboard/marklist/[id]` (`app/dashboard/marklist/[id]/page.tsx`)
- Role Access: `TEACHER`, `HOMEROOM`, `PRINCIPAL`, `OWNER`
- Purpose: Interactive spreadsheet matrix where teachers input raw scores, configure column weights (Quiz, Midterm, Final), view live client GPA curves, and sync grades to official exam records.
- Primary Buttons:
  - "Configure Column Architecture": Sets assessment weights (`POST /api/marklist/config`).
  - "Save Score Cell": Auto-saves score on blur (`POST /api/marklist/entry`).
  - "SYNC TO GRADEBOOK": Scaled gradebook synchronization (`POST /api/marklist/sync`).
- Synchronization: Invalidation: `CACHE_TAGS.GRADES`; updates student and parent views instantly.

#### 066. Read-Only Marklist Matrix Viewer
- Route: `/dashboard/marklist/view` (`app/dashboard/marklist/view/page.tsx`)
- Role Access: `PRINCIPAL`, `OWNER`, `HOMEROOM`
- Purpose: Read-only presentation view of finalized marklists suitable for faculty review meetings and projector displays.
- Primary Buttons: "Print Matrix", "Export CSV", "Toggle Class Ranks".
- Synchronization: Reads live finalized grade data.

#### 067. Real-Time Campus Communications & Messaging
- Route: `/dashboard/messages` (`app/dashboard/messages/page.tsx`)
- Role Access: Authenticated (Staff, Parents)
- Purpose: Real-time institutional messaging system connecting teachers, homeroom educators, and parents. Enforces strict communication boundaries (e.g. blocking unauthorized parent-parent DMs).
- Primary Buttons: "New Broadcast Message" (`POST /api/school/messages`), "Attach File", "Filter by Class".
- Synchronization: Supabase realtime channel `lucy-realtime-messages-stream` broadcasts messages instantly.

#### 068. Campus Operational Expenditures
- Route: `/dashboard/operating-costs` (`app/dashboard/operating-costs/page.tsx`)
- Role Access: `OWNER`
- Purpose: Logging institutional non-salary operational expenses: utilities, laboratory equipment, facility maintenance, and textbook supplies.
- Primary Buttons: "Log New Expense" (`POST /api/school/finance/expenses`), "Upload Receipt Voucher".
- Synchronization: Updates executive net revenue and cashflow charts.

#### 069. Enrolled Parents Directory
- Route: `/dashboard/parents` (`app/dashboard/parents/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Complete roster of registered parents, their linked student profiles, contact credentials, and verified phone numbers.
- Primary Buttons: "Invite Parent", "Manually Link Student to Parent", "Send Batch SMS Notice".
- Synchronization: Invalidation: `CACHE_TAGS.STUDENTS`.

#### 070. General Staff Payroll Register
- Route: `/dashboard/payroll` (`app/dashboard/payroll/page.tsx`)
- Role Access: `OWNER`
- Purpose: High-level institutional payroll summary, active payroll cycles, and tax compliance registers.
- Primary Buttons: "Run Monthly Payroll Cycle", "Download Bank Payment File".
- Synchronization: Generates bank batch transfer records.

#### 071. School Principal & Leadership Roster
- Route: `/dashboard/principals` (`app/dashboard/principals/page.tsx`)
- Role Access: `OWNER`
- Purpose: Directory of appointed principals and vice-principals, their administrative scopes, and delegation privileges.
- Primary Buttons: "Appoint Principal" (`POST /api/school/principals`), "Revoke Administrative Role".
- Synchronization: Invalidation: `CACHE_TAGS.USER_PROFILE`.

#### 072. Institutional Analytics & Report Dossier Compiler
- Route: `/dashboard/reports` (`app/dashboard/reports/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: School-wide academic analytics, grade distributions, GPA curves, and batch report card generation.
- Primary Buttons: "Batch Generate Report Dossiers", "Download Class Summary (CSV)".
- Synchronization: Batch compiles student records; produces signed PDF dossiers.

#### 073. Official Student Report Card Dossier
- Route: `/dashboard/reports/[studentId]` (`app/dashboard/reports/[studentId]/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`, `HOMEROOM`, `PARENT`
- Purpose: Official, accredited report card featuring student photo, subject grade breakdown, attendance record, teacher remarks, cumulative GPA, and cryptographic QR verification stamp.
- Primary Buttons: "Download Official PDF", "Print Report Card", "Send to Parent Portal".
- Synchronization: Reads live academic data; QR code links to public `/verify/student/[studentId]`.

#### 074. Monthly Attendance Audit Register
- Route: `/dashboard/reports/attendance` (`app/dashboard/reports/attendance/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Ministry-compliant monthly attendance register, chronic absenteeism tracking, and excuse audit trails.
- Primary Buttons: "Export Ministry Attendance Audit (PDF/CSV)", "Flag Chronic Absenteeism".
- Synchronization: Compiles historical `AttendanceRecord` data.

#### 075. Academic Performance Directory by Student
- Route: `/dashboard/reports/students` (`app/dashboard/reports/students/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Searchable directory of all students ranked by GPA, class percentile, and academic standing.
- Primary Buttons: "Filter by Grade Level", "Inspect Individual Dossier".
- Synchronization: Live sorting and ranking calculations.

#### 076. Campus Revenue Overview
- Route: `/dashboard/revenue` (`app/dashboard/revenue/page.tsx`)
- Role Access: `OWNER`
- Purpose: High-level visual cash inflow breakdown, term-over-term growth, and tuition payment timeliness telemetry.
- Primary Buttons: "Filter by Payment Channel", "Export Revenue Report".
- Synchronization: Pulls live transaction balances from `Payment` ledger.

#### 077. The Sanctuary Student Peer Support Network
- Route: `/dashboard/sanctuary` (`app/dashboard/sanctuary/page.tsx`)
- Role Access: `STUDENT` (Grades 7–12 only), `TEACHER` (Faculty Mentor mode)
- Purpose: Anonymous, confidential peer support and educator mentorship network with real-time PII de-obfuscation, anti-doxxing shields, and panic exit controls.
- Primary Buttons:
  - "Enter Secure Uplink": Matchmaking initiation (`POST /api/sanctuary/match`).
  - "Send Message": Transmits PII-scrubbed message (`POST /api/sanctuary/message`).
  - "Emergency Helplines": Opens crisis resource drawer.
  - "Panic Exit" (Hotkey Esc): Instantly ends session, purges socket, redirects to home.
- Synchronization: Ephemeral chat stream; flagged terms trigger alerts to SuperAdmin moderation console.

#### 078. Campus-Level Sanctuary Safety Moderation
- Route: `/dashboard/sanctuary/moderation` (`app/dashboard/sanctuary/moderation/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Campus-scoped view of student well-being telemetry, crisis keyword frequency, and assigned counselor escalations.
- Primary Buttons: "Assign Campus Counselor", "Review Escalated Safety Reports".
- Synchronization: Scoped strictly to target institution's student population.

#### 079. School Settings, Branding & Active Term Switcher
- Route: `/dashboard/settings` (`app/dashboard/settings/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Manages school profile, uploads school crest/logo, selects color theme, and switches the active academic term (e.g. Semester 1 to Semester 2).
- Primary Buttons: "Upload School Logo", "Switch Active Term" (`PATCH /api/school/terms`), "Save School Profile".
- Synchronization: Invalidation: `CACHE_TAGS.CLASSES`; updates school branding across report cards and student portals.

#### 080. Encrypted Database Backup & Disaster Recovery
- Route: `/dashboard/settings/data` (`app/dashboard/settings/data/page.tsx`)
- Role Access: `OWNER`
- Purpose: Disaster recovery center allowing school owners to export an encrypted, portable snapshot of their entire campus database (JSON/SQL).
- Primary Buttons: "Generate Encrypted Backup" (`POST /api/school/backups/generate`), "Download Disaster Snapshot".
- Synchronization: Serializes tenant database records into encrypted downloadable file.

#### 081. Campus Staffing & Workload Distribution
- Route: `/dashboard/staffing` (`app/dashboard/staffing/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Evaluates educator teaching load (periods per week), subject coverage ratios, and identifies under-staffed departments.
- Primary Buttons: "Rebalance Workload", "Export Staffing Summary".
- Synchronization: Pulls live allocations from `TeacherAssignment` and `Timetable` models.

#### 082. Full Student Directory & Enrollment Center
- Route: `/dashboard/students` (`app/dashboard/students/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `HOMEROOM`
- Purpose: Complete directory of enrolled students with class filters, active status toggles, and enrollment tools.
- Primary Buttons:
  - "Enroll Student": Opens `<CreateStudentModal>` (`POST /api/school/students`).
  - "Bulk CSV Roster Import": Uploads spreadsheet of students.
  - "Delete Student": Principal creates `ActionRequest`; Owner executes instant deletion.
- Synchronization: Invalidation: `CACHE_TAGS.STUDENTS`; automatically provisions student fee invoices.

#### 083. Student 360 Comprehensive Dossier
- Route: `/dashboard/students/[studentId]` (`app/dashboard/students/[studentId]/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`, `TEACHER`, `HOMEROOM`
- Purpose: Complete individual student profile displaying academic track record, term GPA trends, attendance timeline, medical notices, parent links, and disciplinary remarks.
- Primary Buttons: "Add Teacher Remark", "Generate Student ID Badge", "Link Parent Profile".
- Synchronization: Real-time record updates across faculty views.

#### 084. Faculty Roster & Workload Allocation
- Route: `/dashboard/teachers` (`app/dashboard/teachers/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Complete directory of faculty members, active subjects taught, assigned classrooms, and invitation tracking.
- Primary Buttons:
  - "Invite Teacher": Opens `<InviteTeacherModal>` (`POST /api/school/teachers`).
  - "Assign Subject & Class": Allocates teaching duties (`POST /api/school/assignments`).
  - "Terminate Staff": Opens `ActionRequest` modal for Owner approval.
- Synchronization: Invalidation: `CACHE_TAGS.TEACHERS` and `CACHE_TAGS.USER_PROFILE`.

#### 085. Individual Teacher Profile & Performance Dossier
- Route: `/dashboard/teachers/[id]` (`app/dashboard/teachers/[id]/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Teacher profile displaying assigned timetable schedule, student assessment completion rates, clock-in punctuality, and administrative evaluation notes.
- Primary Buttons: "Edit Faculty Details", "Reassign Classroom Cohorts".
- Synchronization: Updates faculty record and timetable constraints.

#### 086. Master Timetable Collision Defense Engine
- Route: `/dashboard/timetable` (`app/dashboard/timetable/page.tsx`)
- Role Access: `OWNER`, `PRINCIPAL`
- Purpose: Master scheduling grid enforcing conflict-free classroom and faculty period allocations with constraint-satisfaction auto-scheduling.
- Primary Buttons:
  - "Auto-Generate Timetable": Executes constraint solver (`POST /api/school/timetable/auto-generate`).
  - "Add Period Slot": Allocates subject/room slot (`POST /api/school/timetable`).
  - "Export Master Timetable (PDF)": Downloads visual schedule.
- Synchronization: Invalidation: `CACHE_TAGS.CLASSES`; instantly updates teacher schedule and student timetable views.

---

### 6. Faculty & Teacher Portal (9 Pages)

#### 087. Teacher Assignment Manager
- Route: `/dashboard/teacher/assignments` (`app/dashboard/teacher/assignments/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Homework and coursework management where educators post assignments, attach reference PDFs, set due dates, and grade student submissions.
- Primary Buttons: "Create New Assignment" (`POST /api/school/assignments`), "Grade Submissions", "Close Assignment".
- Synchronization: Invalidation: `CACHE_TAGS.ASSIGNMENTS`; student homework trackers update immediately.

#### 088. Daily Roll-Call Authority Sheet
- Route: `/dashboard/teacher/attendance` (`app/dashboard/teacher/attendance/page.tsx`)
- Role Access: `TEACHER`, `HOMEROOM`
- Purpose: Daily touch-optimized roll call sheet allowing educators to mark students Present, Absent, Late, or Excused and seal the official record.
- Primary Buttons:
  - "Mark All Present": Sets all enrolled students to Present in one tap.
  - "Status Toggles": Individual Present / Late / Absent pills.
  - "SEAL RECORDS": Locks attendance log (`POST /api/school/attendance`).
- Synchronization: Invalidation: `CACHE_TAGS.SCHOOL_ATTENDANCE`; Supabase realtime channel updates parent and student portals within 3 seconds.

#### 089. Teacher Absence Authorizations & Notice List
- Route: `/dashboard/teacher/authorizations` (`app/dashboard/teacher/authorizations/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Roster of approved student absences and authorized medical leaves, explaining why specific scholars are marked Excused.
- Primary Buttons: "Filter by Assigned Class", "View Excuse Attachment".
- Synchronization: Auto-refreshes when Principal approves absence requests.

#### 090. Examination Library & Repository
- Route: `/dashboard/teacher/exams` (`app/dashboard/teacher/exams/page.tsx`)
- Role Access: `TEACHER`, `HOMEROOM`
- Purpose: Directory of all created examinations, quizzes, and diagnostic tests filterable by status: Draft, Published, and Sealed/Locked.
- Primary Buttons: "Create New Assessment" (navigates to `/create`), "Edit Assessment", "View Gradebook".
- Synchronization: Invalidation: `CACHE_TAGS.GRADES`.

#### 091. GenAI Assessment Question Generator & Composer
- Route: `/dashboard/teacher/exams/create` (`app/dashboard/teacher/exams/create/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Dual-mode exam builder offering manual question authoring and Gemini GenAI curriculum-based question synthesis with difficulty weighting and lockdown security toggles.
- Primary Buttons:
  - "AI Generate Questions": Synthesizes questions via prompt (`POST /api/teacher/exams/extract`).
  - "Add Question Manually": Appends custom MCQ or essay item.
  - "Save Assessment Draft" / "Publish Assessment" (`POST /api/teacher/exams`).
- Synchronization: Invalidation: `CACHE_TAGS.GRADES`; published tests appear immediately in student portals.

#### 092. Interactive Exam Question & Rubric Editor
- Route: `/dashboard/teacher/exams/[id]/editor` (`app/dashboard/teacher/exams/[id]/editor/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Fullscreen question editor allowing point weighting adjustments, time limit settings, rubric authoring, and lockdown security configuration.
- Primary Buttons: "Save Changes", "Publish Assessment", "Seal / Lock Exam" (blocks future score mutations).
- Synchronization: Invalidation: `CACHE_TAGS.GRADES`.

#### 093. Real-Time Digital Gradebook
- Route: `/dashboard/teacher/gradebook/[examId]` (`app/dashboard/teacher/gradebook/[examId]/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Live grading sheet for specific assessments showing student scores, auto-graded objective items, AI feedback suggestions, and bulk grade curves.
- Primary Buttons: "Save Grade Adjustments" (`POST /api/teacher/gradebook`), "Generate AI Feedback", "Lock Exam Marks".
- Synchronization: Atomic transaction updates `GradeRecord`; invalidates `CACHE_TAGS.GRADES`.

#### 094. Daily Lesson Plan Repository & Syllabus Tracker
- Route: `/dashboard/teacher/lessons` (`app/dashboard/teacher/lessons/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Repository for lesson plans, curriculum syllabus alignment, digital study material uploads, and unit pacing trackers.
- Primary Buttons: "Add Lesson Plan" (`POST /api/teacher/lessons`), "Attach Study Handout", "Mark Unit Complete".
- Synchronization: Published lesson notes appear in student and parent lesson repositories.

#### 095. Personal Faculty Schedule
- Route: `/dashboard/teacher/schedule` (`app/dashboard/teacher/schedule/page.tsx`)
- Role Access: `TEACHER`
- Purpose: Personalized weekly schedule displaying allocated teaching periods, classroom numbers, and upcoming class alerts.
- Primary Buttons: "Print Teacher Schedule", "Download ICS Calendar".
- Synchronization: Auto-synchronized with Master Timetable solver.

---

### 7. Parent & Guardian Portal (3 Pages)

#### 096. Parent Command Center & Multi-Child Overview
- Route: `/dashboard/parent` (`app/dashboard/parent/page.tsx`)
- Role Access: `PARENT`
- Purpose: Central family hub featuring a multi-child switcher, live daily attendance pulse, current GPA badges, and outstanding tuition fee balance alerts.
- Primary Buttons:
  - "Child Context Switcher": Toggles active student context.
  - "Link Child via Badge Code": Opens `<PairStudentModal>` (`POST /api/parent/link-student`).
  - "Pay Outstanding Tuition": Opens payment modal.
  - "View Report Dossier": Navigates to `/dashboard/reports/[studentId]`.
- Synchronization: Realtime channel triggers live badge update when attendance or grades change.

#### 097. Absence Excuse Submission & Approval Tracker
- Route: `/dashboard/parent/authorizations` (`app/dashboard/parent/authorizations/page.tsx`)
- Role Access: `PARENT`
- Purpose: Allows parents to submit absence excuse requests with date ranges, reason categories, and doctor note attachments, tracking approval status in real time.
- Primary Buttons: "Submit Absence Request" (`POST /api/parent/authorizations`), "Attach Medical Slip".
- Synchronization: Creates `AbsenceAuthorization` with `PENDING`; status updates to `APPROVED` upon Principal action.

#### 098. Child Homework & Project Tracker
- Route: `/dashboard/parent/homework` (`app/dashboard/parent/homework/page.tsx`)
- Role Access: `PARENT`
- Purpose: Monitors all assigned homework, coursework projects, submission statuses, and teacher grading remarks across enrolled children.
- Primary Buttons: "Filter by Child", "Inspect Assignment Guidelines", "View Graded Feedback".
- Synchronization: Sourced from `Assignment` and `AssignmentSubmission` records; updates in real time.

---

### 8. Scholar & Student Portal (9 Pages)

#### 099. Student Home Command Center
- Route: `/dashboard/student` (`app/dashboard/student/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Personalized student dashboard showing daily timetable schedule, upcoming examination countdowns, active homework tasks, and recent grades.
- Primary Buttons: "Start Available Exam", "Submit Coursework", "View Attendance History".
- Synchronization: Aggregates personal student data; auto-refreshes via Supabase realtime channel.

#### 100. Student Coursework & Assignment Submissions
- Route: `/dashboard/student/assignments` (`app/dashboard/student/assignments/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Active assignments list with submission upload modals, deadline countdowns, and teacher evaluation remarks.
- Primary Buttons: "Upload Submission File" (`POST /api/student/assignments`), "View Graded Rubric".
- Synchronization: Creates `AssignmentSubmission`; notifies teacher grading inbox.

#### 101. Student Personal Attendance Calendar
- Route: `/dashboard/student/attendance` (`app/dashboard/student/attendance/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Interactive calendar tracking personal presence, excused leaves, late arrivals, and overall attendance percentage.
- Primary Buttons: "Filter by Month", "Inspect Absence Excusal Details".
- Synchronization: Sourced from `AttendanceRecord`; updates within 3 seconds of roll-call sealing.

#### 102. Student Absence Authorizations History
- Route: `/dashboard/student/authorizations` (`app/dashboard/student/authorizations/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Log of all parent-submitted and administratively authorized absence leave requests.
- Primary Buttons: "View Authorization Details", "Inspect Leave Approval Hash".
- Synchronization: Displays live approval status from `AbsenceAuthorization`.

#### 103. Available Examination Portal
- Route: `/dashboard/student/exams` (`app/dashboard/student/exams/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Examination launcher displaying scheduled, active, and completed assessments with duration and security indicators.
- Primary Buttons: "Start Assessment" (`POST /api/student/exams/start`, redirects to `/exam/[id]`), "Review Past Test".
- Synchronization: Published tests appear automatically when teacher publishes exam.

#### 104. Subject Gradebook & Academic Rankings
- Route: `/dashboard/student/grades` (`app/dashboard/student/grades/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Comprehensive gradebook breakdown displaying subject scores, credit hours, weighted percentages, class GPA ranking, and academic honors.
- Primary Buttons: "View Term GPA Curve", "Download Academic Transcript (PDF)".
- Synchronization: Updates immediately when teacher executes marklist gradebook sync.

#### 105. Class Syllabus & Study Material Downloads
- Route: `/dashboard/student/lessons` (`app/dashboard/student/lessons/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Access to teacher-published daily lesson notes, curriculum unit summaries, and study handouts.
- Primary Buttons: "Download Study Handout (PDF)", "Filter by Subject".
- Synchronization: Pulls published resources from `Lesson` repository.

#### 106. Student Digital ID Badge & Profile
- Route: `/dashboard/student/profile` (`app/dashboard/student/profile/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Digital student identity badge displaying portrait, student registration code, grade level, emergency contacts, and cryptographic verification QR badge.
- Primary Buttons: "Download Digital Badge (PNG/PDF)", "Print Student ID Card".
- Synchronization: QR code links directly to public `/verify/student/[studentId]`.

#### 107. Student Weekly Schedule Grid
- Route: `/dashboard/student/timetable` (`app/dashboard/student/timetable/page.tsx`)
- Role Access: `STUDENT`
- Purpose: Interactive weekly schedule grid showing daily periods, subjects, assigned classrooms, and instructor names.
- Primary Buttons: "Print Timetable", "Sync to Mobile Calendar".
- Synchronization: Auto-synchronized with Master Timetable solver.

---

## Technical Audit & Verification Procedures

To verify that the platform functions without regression prior to video recording, execute the following commands in the project root:

1. TypeScript Type Contract Verification:
   ```bash
   npx tsc --noEmit
   ```
   Ensures zero syntax, type drift, or interface mismatches across all 237 routes.

2. Automated Unit and Integration Test Suite:
   ```bash
   npm test
   ```
   Executes 38 automated Jest test suites covering financial ledger arithmetic, timetable collision prevention, attendance excusal sync, and Sanctuary PII scrubbing.

3. Administrator Multi-Tenant Sentinel Audit:
   ```bash
   npm run audit:administrator
   ```
   Verifies all 17 Technical Defense Sentinels across all 305 platform source files.

---

*Authored by the Autonomous Engineering & System Defense Team — LUCY OS v2.4.0 Enterprise Release*
