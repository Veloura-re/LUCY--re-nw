# LUCY OS - Complete Platform Documentation & Testing Manual

**Document Classification**: Institutional Operations, Quality Assurance & Growth Playbook  
**System Version**: LUCY OS 2.4.0 (Enterprise Multi-Tenant Release)  
**Security Standard**: FERPA, GDPR, EDPP Aligned | Zero-Trust Audit Invariant  

---

## Part 1: Strategic Growth & Marketing Playbook

### 1. Core Market Positioning & Value Proposition
LUCY OS is positioned not as an administrative utility, but as the **Autonomous Operating System for High-Prestige Academies**. 

Traditional school software digitizes paperwork into cumbersome PDFs. LUCY executes the underlying cognitive burden autonomously:
- **For School Owners & Directors**: Eliminates tuition leakage, accelerates fee collections by 25%, and provides real-time cash flow telemetry.
- **For Teachers**: Reclaims 40 hours per month by automating weighted grading math, GPA curves, and generating report cards in 60 seconds.
- **For Parents**: Eliminates the 90-day information blackout with 3-second absence SMS alerts and continuous smartphone academic tracking.
- **For Students**: Protects emotional resilience through The Sanctuary—an anonymous, zero-doxxing peer support space for Grades 7–12.

---

### 2. The 4-Month Full Term Free Trial Funnel (The Trojan Horse Acquisition)

```
[STAGE 1: EXECUTIVE BRIEFING] 
└── 15-Minute live command center demo for School Owners & Principals.
    Focus: Timetable clash prevention and 60-second report card generation.
        │
        ▼
[STAGE 2: ZERO-RISK TERM PILOT]
└── 4 Full Months Free (1 Entire Academic Term).
    Unlimited teachers, students, and parents with zero server hardware required.
        │
        ▼
[STAGE 3: ECOSYSTEM LOCK-IN]
└── Parents receive real-time SMS alerts; teachers save 40h/month.
    The institution experiences operational clarity and cannot revert to manual paper.
        │
        ▼
[STAGE 4: ANNUAL CONTRACT CONVERSION]
└── Seamless transition to annual per-student institutional licensing.
    Payment Channels: CBE (1000790420393), Telebirr (0997267373), Stripe, CBE Birr.
```

---

### 3. Growth Campaign Assets & Communication Templates

#### A. Telegram Channel & Broadcast Copy
```text
LUCY OS // INSTITUTIONAL SYSTEM RELEASE

Eliminate manual spreadsheets, lost receipts, and end-of-term grading panic. The modern campus operating system is live.

Core Capabilities:
- Autonomous Weighted Marklists: Instant calculation of GPA curves and class ranks.
- Live Tuition Settlement: Automated mobile reconciliation via Telebirr and CBE Birr.
- Collision-Free Timetables: Constraint-based scheduling with zero room double-bookings.
- The Sanctuary: Safe, confidential student peer uplink with real-time PII shields.

Experience the Live Presentation: https://5-cn.net/deck
Claim 4-Month Campus Free Trial: https://5-cn.net/register
Support & Inquiries: contact@5-cn.net
```

#### B. Direct Executive Outreach Letter to School Owners
```text
Subject: Eliminating administrative friction and tuition leakage at [School Name]

Dear [Principal/Owner Name],

Every term, schools lose dozens of educator hours to manual calculator arithmetic and face unpredictable cash flow from unverified bank deposit slips.

LUCY OS was engineered to solve these exact institutional challenges:
1. Automated Marklists: Saves each faculty member 40 hours monthly on grading.
2. 60-Second Report Dossiers: Generates school-branded, QR-verified PDF report cards in one click.
3. Live Tuition Ledger: Reconciles Telebirr and CBE payments directly into your general ledger.
4. Timetable Collision Defense: Prevents classroom double-bookings across your master schedule.

We are inviting [School Name] to participate in our Term Partnership Program with a Full 4-Month Free Trial covering your entire campus with zero hardware investment.

Would you be open to a brief 10-minute live demonstration this week?

Sincerely,
LUCY Institutional Engineering Team
contact@5-cn.net | support@5-cn.net
```

---

## Part 2: Platform Architecture & Role Access Matrix

### 1. System Architecture Overview
- **Frontend Layer**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Framer Motion.
- **Backend & Database**: PostgreSQL hosted on Supabase with Prisma ORM (Static ESM imports).
- **Authentication**: Supabase Auth integrated with custom Prisma user records and session validation.
- **Export Engines**: Dynamic client-side PowerPoint (`pptxgenjs`) and vector PDF (`jspdf`) generation.
- **Multi-Tenant Invariant**: Every database mutation to sensitive resources records an `AuditLog` entry with a non-null `schoolId`.

### 2. Role-Based Access Control (RBAC) Matrix

| Role | Permitted Route Surface | Core Capabilities & Permissions |
| :--- | :--- | :--- |
| **SUPERADMIN** | `/admin/*`, `/admin/sanctuary`, `/admin/dashboard` | Global platform monitoring, cross-campus Sanctuary moderation console, school onboarding, tenant health, global audit inspection. |
| **OWNER** | `/dashboard/*`, `/dashboard/director/*`, `/dashboard/finance` | Full campus management, tuition fee structures, expense logging, payroll, teacher allocations, school settings. |
| **PRINCIPAL** | `/dashboard/*`, `/dashboard/director/*`, `/dashboard/timetable` | Master schedule generation, exam approvals, marklist publishing, staff attendance, student disciplinary remarks. |
| **TEACHER** | `/dashboard/teacher/*`, `/dashboard/attendance`, `/dashboard/assignments` | Marklist score entry, 10-second digital roll call, lesson planning, assignment grading, student remarks. |
| **HOMEROOM** | All Teacher routes + Homeroom specific views | Homeroom class oversight, parent pairing approvals, cumulative student dossiers. |
| **PARENT** | `/dashboard/parent/*` | Multi-child portal, real-time grades, attendance records, digital tuition checkout, absence leave requests. |
| **STUDENT** | `/dashboard/student/*`, `/sanctuary` | Grades view, homework submission, timetable schedule, anonymous peer uplink (Grades 7–12 only). |

---

## Part 3: Comprehensive Feature Breakdown & Test Suites

### Test Suite 01: SuperAdmin Sanctuary Moderation Console
- **Route**: `/admin/sanctuary`
- **Objective**: Verify real-time moderation of anonymous peer sessions, PII de-obfuscation, and counselor escalation.
- **Test Steps**:
  1. Navigate to `/admin/sanctuary` as a `SUPERADMIN`.
  2. Inspect the telemetry dashboard (Total Sessions, Flagged Intercepts, Active Chats, Counselors Dispatched).
  3. Filter reports by Topology (`All Topologies`, `INTRA_CAMPUS`, `CROSS_CAMPUS`).
  4. Click on a flagged session to open the interactive transcript scrubber.
  5. Verify that scrubbed tokens (`[PHONE_REDACTED]`, `[EMAIL_REDACTED]`, `[SOCIAL_REDACTED]`) are highlighted with danger badges.
  6. Execute a moderation action:
     - Click **Dispatch Counselor**: Verify student is routed to verified faculty and audit log is recorded.
     - Click **Terminate Session**: Verify session is instantly dissolved with reason logged.
     - Click **Dismiss Report**: Verify report is archived.

---

### Test Suite 02: Academic Marklists & 60-Second Report Cards
- **Routes**: `/dashboard/teacher`, `/dashboard/director/marklist`
- **Objective**: Validate continuous formula math, dynamic curves, and cryptographic report card generation.
- **Test Steps**:
  1. Log in as `TEACHER` and open a assigned class marklist.
  2. Enter raw scores across assessment columns (e.g., 20% Quizzes, 30% Midterms, 50% Finals).
  3. Confirm that totals, weighted percentages, letter grades, and ranks update in real time with zero calculation errors.
  4. Submit marklist for Director approval.
  5. Log in as `PRINCIPAL` or `OWNER` at `/dashboard/director/marklist`.
  6. Approve the marklist and click **Generate Class Report Cards**.
  7. Verify the generated PDF dossier contains school branding, QR verification stamp, student GPA, and teacher remarks.

---

### Test Suite 03: Timetable Solver & Collision Defense
- **Routes**: `/dashboard/timetable`, `/dashboard/director/timetable`
- **Objective**: Ensure the constraint satisfaction scheduling engine prevents room double-bookings and faculty overload.
- **Test Steps**:
  1. Log in as `PRINCIPAL` and navigate to the Timetable Manager.
  2. Create a new master schedule or click **Auto-Generate Timetable**.
  3. Intentionally attempt to book two different classes in the same classroom at 9:00 AM on Monday.
  4. Verify the system flags a collision warning and blocks the double-booking.
  5. Publish the schedule and verify that teachers and students see their synchronized schedules in their respective portals.

---

### Test Suite 04: Digital Roll Call & 3-Second Parent Absence Alert
- **Routes**: `/dashboard/attendance`, `/dashboard/parent`
- **Objective**: Test single-tap attendance roll calls and instant parent SMS dispatch.
- **Test Steps**:
  1. Log in as `TEACHER` on a mobile device or desktop.
  2. Open the morning roll call roster for your homeroom.
  3. Tap student cards to toggle status (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).
  4. Click **Submit Attendance**.
  5. Verify that absent students trigger an automated SMS notification payload to the linked parent within 3 seconds.
  6. Log in as the linked `PARENT` at `/dashboard/parent` and verify the absence status reflects in real time.

---

### Test Suite 05: Financial Ledger & Mobile Tuition Reconciliation
- **Route**: `/dashboard/finance`
- **Objective**: Validate digital fee structures, invoice generation, and Telebirr/CBE reconciliation.
- **Test Steps**:
  1. Log in as `OWNER` or Financial Lead at `/dashboard/finance`.
  2. Create a term tuition fee structure (e.g., Grade 10 - Semester 1 Tuition).
  3. Issue invoices across enrolled students.
  4. Verify parents receive an invoice notice with Telebirr and CBE payment references.
  5. Simulate payment settlement via mobile checkout webhook.
  6. Verify the student tuition ledger updates to `PAID` and an immutable `BillingReceipt` is generated.
  7. Check the executive cash-flow telemetry dashboard for gross collections and outstanding arrears.

---

### Test Suite 06: The Presentation Deck & Export Engine
- **Route**: `/deck`
- **Objective**: Validate interactive stage keynote, fullscreen presentation mode, and PowerPoint/PDF downloads.
- **Test Steps**:
  1. Open `/deck` in your browser.
  2. Press **F** or click **Projector Mode** to enter fullscreen stage view.
  3. Navigate through all 10 acts using **Arrow Right** or **Spacebar**.
  4. Click **PPTX** in the top navbar:
     - Verify `LUCY_OS_Keynote_Presentation.pptx` downloads cleanly.
     - Open in PowerPoint: verify 16:9 widescreen layout, fade slide transitions, and embedded speaker notes in the notes pane.
  5. Click **PDF** in the top navbar:
     - Verify `LUCY_OS_Keynote_Presentation.pdf` downloads with high-resolution vector landscape slides.

---

## Part 4: Complete API Surface Reference

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user via Supabase and returns role-scoped session. |
| `POST` | `/api/auth/register` | Public | Registers a new school and owner account for the 4-month trial. |
| `GET` | `/api/sanctuary/moderation` | `SUPERADMIN` | Fetches active Sanctuary sessions, topology classifications, and reports. |
| `POST` | `/api/sanctuary/moderation/action` | `SUPERADMIN` | Executes moderation actions (dispatch counselor, terminate, dismiss). |
| `POST` | `/api/sanctuary/match` | `STUDENT` (Grades 7–12) | Ephemeral matchmaking for anonymous peer uplink. |
| `POST` | `/api/sanctuary/message` | `STUDENT` | Sends message through PII de-obfuscation guardrails. |
| `POST` | `/api/sanctuary/end` | `STUDENT` | Terminates session and purges ephemeral conversation memory. |
| `POST` | `/api/attendance/submit` | `TEACHER`, `PRINCIPAL` | Submits single-tap classroom attendance and dispatches parent alerts. |
| `GET` | `/api/finance/telemetry` | `OWNER`, `SUPERADMIN` | Returns live cash-flow metrics, collection ratios, and expense ledgers. |
| `POST` | `/api/public/security-report` | Public | Accepts vulnerability disclosures and security advisories. |

---

## Part 5: Quality Assurance & Audit Verification Commands

Execute the following commands in the terminal to verify zero regressions across the codebase:

```bash
# 1. Verify TypeScript compilation and type contracts
npx tsc --noEmit

# 2. Run the complete automated Jest test suite (38 unit & integration tests)
npm test

# 3. Execute the Administrator 17-Sentinel platform audit across all 305 files
npm run audit:administrator

# 4. Start local development server
npm run dev
```
