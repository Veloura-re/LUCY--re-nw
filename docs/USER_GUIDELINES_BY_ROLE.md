# LUCY OS - Comprehensive Role Guidelines & Data Scope Manual

## Document Overview
This document serves as the master operational reference for all user roles across the LUCY ecosystem. Each section provides an exhaustive description of role permissions, data visibility, daily workflows, operational checklists, step-by-step task instructions, and troubleshooting procedures.

---

## 1. System-Wide Role Hierarchy & Security Governance

LUCY operates on strict Role-Based Access Control (RBAC) backed by institutional multi-tenancy. Every request is verified against the user's active session, cryptographic role claims, and school isolation boundaries.

### Platform Roles:
1. `SUPERADMIN`: Global system owner, infrastructure defense, multi-school tenant management, and emergency content moderation.
2. `OWNER`: School proprietor, institutional revenue management, financial accounts, and high-level faculty governance.
3. `PRINCIPAL`: Academic executive, academic terms management, timetable conflict engine, faculty allocation, and gradebook finalization.
4. `TEACHER`: Subject instructor, daily attendance roll call, continuous assessment marklists, lesson materials, and AI quiz creation.
5. `HOMEROOM`: Class section shepherd, conduct/effort evaluations, student pastoral care, and parent absence authorization.
6. `PARENT`: Guardian portal, multi-scholar linking, real-time arrival alerts, fee settlement (Chapa/Stripe), and absence permit filings.
7. `STUDENT`: Scholar terminal, period timetable schedules, timed assessments, lesson file downloads, and The Sanctuary anonymous counseling.
8. `ACCOUNTANT`: School finance staff invited by a director. Fees, invoices, expenses, payment checks and payroll. No access to the school's LUCY subscription or to student academic records.
9. `RECORDER`: Student records staff invited by a director. Creates and edits student, parent and class records. Cannot delete records and cannot see finance.

---

## 2. Subject Teacher (`TEACHER`)

### 2.1 Role Summary
Subject Teachers are responsible for classroom execution, recording daily roll call, assessing academic performance on continuous marklists, publishing lesson resources, and administering timed quizzes.

### 2.2 Data Visibility & Boundary Matrix
- **Visible & Editable**:
  - Assigned class sections and roster student names (`/dashboard/teacher/classes`).
  - Active academic term continuous assessment marklists (`/dashboard/marklist`).
  - Daily roll-call attendance records for assigned periods (`/dashboard/attendance`).
  - Personal lesson plans, syllabi, and assignment briefs (`/dashboard/lessons`).
  - Personal staff clock-in / clock-out timestamps (`StaffAttendanceRecord`).
  - Direct inquiry threads from parents of currently taught students (`/dashboard/messages`).
- **Strictly Restricted**:
  - Institutional tuition collections, fee ledgers, and school bank accounts.
  - Salary and payroll details of colleagues (`StaffPayroll`).
  - Conduct remarks and pastoral counseling notes of unassigned homerooms.
  - School-wide master timetable and room allocation overrides.
  - Concluded academic terms marklists (retained in Read-Only archive status).

### 2.3 Daily Operating Routine
- **08:00 - Campus Arrival**: Open Teacher Dashboard (`/dashboard/teacher`) and select "Clock In" to register presence with biometric/device verification.
- **Period Start - Attendance Roll Call**: Launch roll call at `/dashboard/attendance`. Toggle student statuses (Present, Absent, Late, Excused) and submit. Absent triggers instantly notify parents.
- **Mid-Day - Continuous Assessment Scoring**: Access active term marklist at `/dashboard/marklist`. Enter component scores (Quizzes, Midterms, Assignments). Ensure values auto-aggregate against maximum thresholds.
- **Afternoon - Material Distribution**: Upload syllabus units, homework briefs, or reference PDFs at `/dashboard/lessons`. Generate AI quiz remix items if preparing tests.
- **16:30 - Campus Departure**: Verify all attendance rosters for the day show "Submitted" status, review incoming parent messages, and select "Clock Out".

### 2.4 Key Operating Procedures
1. **Recording Daily Attendance**:
   - Navigate to `/dashboard/attendance`.
   - Select Class Section, Subject, and Academic Period.
   - Review roster list. By default, all students are flagged as Present.
   - Click on any absent student to switch to Absent (Red) or Late (Amber).
   - Enter reason if student produced a physical hall pass.
   - Click "Submit Attendance Roster". System commits records and dispatches guardian notifications.
2. **Editing Active Term Marklists**:
   - Navigate to `/dashboard/marklist`.
   - Select Class Section and Subject. Note: Closed terms will display "Term Concluded - Read Only".
   - Locate the student row and relevant assessment column (e.g., Assignment 1, Midterm Exam).
   - Enter numerical score. Input validation blocks values exceeding defined maximums.
   - Click "Save Changes". Audit log records timestamp, editor ID, and delta.
3. **Administering AI-Remixed Quizzes**:
   - Navigate to `/dashboard/exams`.
   - Click "Create New Exam". Provide Topic, Target Grade Level, and Difficulty.
   - Click "Generate with AI" or paste custom questions.
   - Set start timestamp, duration limit, and maximum attempt count.
   - Toggle status to "Published".

---

## 3. Homeroom Teacher (`HOMEROOM`)

### 3.1 Role Summary
Homeroom Teachers serve as the primary pastoral guardians for an assigned class section. They oversee student behavioral welfare, record official semester report conduct marks, maintain confidential faculty counseling notes, and authorize parent absence permits.

### 3.2 Data Visibility & Boundary Matrix
- **Visible & Editable**:
  - Complete demographic and academic profile for all scholars in their assigned section.
  - Section terminal report conduct marks, effort grades, and teacher recommendations.
  - Parental absence authorization requests and medical certificates.
  - Section-wide aggregate attendance ratios and persistent truancy patterns.
  - Confidential faculty counseling notes (`InternalNote`).
- **Strictly Restricted**:
  - Direct score modification on subject marklists taught by other teachers (must request correction via subject teacher).
  - Financial fee collections and accounting ledgers.
  - Other class sections' pastoral notes and conduct remarks.

### 3.3 Daily Operating Routine
- **08:15 - Morning Section Briefing**: Review section attendance dashboard. Check which scholars have unexcused absences.
- **Morning - Excuse Verification**: Open `/dashboard/homeroom/excuses` to review absence permits submitted by parents. Inspect attached medical notes and accept or reject.
- **Weekly - Pastoral Welfare**: Record behavioral milestones or counseling observations in the student's confidential journal.
- **Term-End - Report Card Consolidation**: Open `/dashboard/homeroom/remarks`. Populate conduct grades (A through F), effort evaluation, and narrative feedback. Submit for Principal countersignature.

### 3.4 Key Operating Procedures
1. **Processing Absence Excuse Requests**:
   - Open `/dashboard/homeroom/excuses`.
   - Select pending request from parent.
   - Review date range, excuse reason, and medical certificate attachments.
   - Select "Approve Permit" or "Deny Permit" with mandatory explanatory feedback.
   - On approval, the system updates historical attendance records to "Excused" automatically.
2. **Entering Term Conduct & Effort Remarks**:
   - Open `/dashboard/homeroom/remarks`.
   - Filter by current active Academic Term.
   - For each student, select Conduct Level (Excellent, Very Good, Satisfactory, Needs Attention).
   - Input narrative remark summarizing student participation, leadership, and emotional growth.
   - Click "Submit Section Remarks". Principal receives immediate notification for final printing approval.

---

## 4. Student / Scholar (`STUDENT`)

### 4.1 Role Summary
Students utilize the scholar terminal to monitor weekly period timetables, participate in timed digital examinations, download syllabus packs, submit assignments, and access The Sanctuary for confidential peer support.

### 4.2 Data Visibility & Boundary Matrix
- **Visible**:
  - Personal period timetable, classroom locations, and instructor details (`/dashboard/student`).
  - Personal verified grades, continuous assessment totals, and published term report cards.
  - Active online examination portals during designated testing windows (`/dashboard/student/exams`).
  - Published course materials, lecture notes, and syllabus PDFs (`/dashboard/student/lessons`).
  - Personal attendance percentages and absence records.
  - The Sanctuary peer counseling discussions.
- **Strictly Restricted**:
  - Peer academic scores, grade ranking lists, and marklists.
  - Upcoming exam question banks prior to the official start window.
  - Administrative records, staff credentials, and institutional settings.

### 4.3 Daily Operating Routine
- **Morning - Timetable Review**: Check `/dashboard/student` for current day schedule, room assignments, and potential teacher substitutions.
- **Mid-Day - Assignment Submissions**: Submit completed homework documents or shared drive links via `/dashboard/student/assignments`.
- **Scheduled Windows - Online Quizzes**: Join timed exam sessions at `/dashboard/student/exams`. Complete questions before the synchronized server countdown expires.
- **Evening - Review & Well-Being**: Check teacher comments on graded work and access The Sanctuary if needing peer advice or emotional decompression.

---

## 5. Parent & Guardian (`PARENT`)

### 5.1 Role Summary
Parents access the family portal to monitor multiple enrolled children, receive automated instant truancy alerts, view verified grade reports, settle school fees, and submit absence permits.

### 5.2 Data Visibility & Boundary Matrix
- **Visible & Actionable**:
  - Academic summaries, attendance logs, and report cards of linked biological children.
  - Real-time notification log of daily campus arrivals and departures.
  - School invoice records, itemized fees, payment receipts, and outstanding balances.
  - Direct messaging channel with their children's teachers and homeroom faculty.
  - Form to submit absence notifications and medical excuse documentation.
- **Strictly Restricted**:
  - Profiles, names, photos, or academic records of other students in the school.
  - Internal teacher-to-teacher staff notes and disciplinary deliberations.
  - School operating margins, staff payroll, and master financial ledgers.

### 5.3 Daily Operating Routine
- **08:30 - Punctuality Check**: Verify automated notification confirming your child has been scanned in or marked Present.
- **Weekly - Gradebook Check**: Review newly posted quiz and assignment marks at `/dashboard/parent`.
- **Monthly - Tuition & Fees Settlement**: Check `/dashboard/parent/billing` for newly issued invoices. Settle securely via Chapa (Telebirr/CBE) or Stripe.
- **As Needed - Absence Permit Filing**: Submit planned medical or travel absence notices in advance to avoid unexcused penalties.

### 5.4 Key Operating Procedures
1. **Linking a Student to Your Parent Account**:
   - Open `/dashboard/parent`.
   - Click "Link Child Profile".
   - Enter the student's unique 8-character Admission Number or scan the student QR badge.
   - Enter student date of birth for identity verification.
   - Click "Submit Link Request". If verified, the student is instantly added to your dashboard.
2. **Paying Tuition Invoices**:
   - Navigate to `/dashboard/parent/billing`.
   - Select invoice showing "Pending" or "Overdue".
   - Choose payment method: Chapa (Telebirr, CBE Birr) or International Credit Card (Stripe).
   - Complete checkout. On authorization, status instantly updates to "Paid" and downloadable PDF receipt generates.

---

## 6. Principal & Academic Administrator (`PRINCIPAL`)

### 6.1 Role Summary
Principals govern school-wide academic integrity, manage academic term lifecycles, configure teacher schedules and room allocations, resolve timetable collisions, review marklists, and issue student credentials.

### 6.2 Data Visibility & Boundary Matrix
- **Visible & Configurable**:
  - School-wide academic terms, term transition dates, and marklist editability controls.
  - Master student registry, enrollment allocations, and QR identity badges.
  - Faculty directory, subject specializations, and weekly teaching loads.
  - Master period timetable, room capacities, and collision detection analytics.
  - Comprehensive gradebooks, class rankings, and semester report card printing.
- **Strictly Restricted**:
  - Global tenant administration for external schools (isolated to assigned school tenant).
  - Deletion of institutional financial ledger entries (system operates under double-entry audit invariants).

### 6.3 Daily Operating Routine
- **07:45 - Daily Staff & Attendance Oversight**: Review school-wide staff clock-in rates and scholar absenteeism alerts.
- **Mid-Term - Timetable & Room Auditing**: Inspect timetable conflict engine for overlapping teacher slots or double-booked facilities.
- **Term-End - Marklist Lockdown**: Enforce grade submission deadlines. Review submitted teacher marklists and lock terms to prevent post-deadline tampering.
- **Term Transition - Report Generation**: Finalize semester report cards with homeroom conduct remarks and export consolidated transcripts.

---

## 7. School Owner & Proprietor (`OWNER`)

### 7.1 Role Summary
School Owners oversee the commercial and institutional sustainability of the campus. They control institutional fee structures, monitor bank reconciliations, review faculty payroll budgets, and manage facility capacity.

### 7.2 Data Visibility & Boundary Matrix
- **Visible & Governed**:
  - Institutional revenue graphs, fee collection pipelines, and overdue balance totals.
  - Official school payment gateway integrations (CBE merchant ID, Telebirr merchant credentials, Stripe keys).
  - Staff payroll ledgers, compensation structures, and disbursement approvals.
  - Campus enrollment growth metrics, demographic capacity, and retention analytics.
  - High-level audit logs for all financial and personnel modifications.
- **Strictly Restricted**:
  - Cross-tenant data of other educational institutions on the platform.
  - Individual student counseling private journals unless escalated by legal mandate.

### 7.3 Daily Operating Routine
- **Morning - Financial Telemetry**: Review revenue intake across Chapa and Stripe gateways on the Owner Dashboard (`/dashboard/owner`).
- **Weekly - Fee Defaulter Review**: Inspect overdue student invoice collections. Dispatch automated reminder notices to parents.
- **Monthly - Payroll Approval**: Review staff attendance metrics, leave deductions, and approve monthly payroll disbursement.

---

## 8. Super Administrator (`SUPERADMIN`)

### 8.1 Role Summary
Super Administrators are platform custodians who manage multi-tenant school licensing, monitor distributed infrastructure health, analyze system error logs, enforce zero-trust security postures, and perform emergency safety moderation.

### 8.2 Data Visibility & Boundary Matrix
- **Full Global Visibility**:
  - All school tenant organizations, domain bindings, and license expiration dates.
  - Serverless execution health, database connection pool telemetry, and Redis cache states.
  - 24-hour centralized error diagnostics (`ErrorLog`) and audit logs across all tenants.
  - The Sanctuary emergency escalation reports requiring immediate crisis intervention.
- **Strict Governance Constraints**:
  - All interventions into tenant accounts are cryptographically signed and logged in permanent audit records.

---

## 8A. Finance Accountant (`ACCOUNTANT`) and Records Recorder (`RECORDER`)

### Role Summary
Directors (principal or owner) invite both roles by email from `/dashboard/staff-roles` (Finance & Records Staff). The invitation expires after 7 days and can be revoked while unused. Each invitation and revocation is written to the audit log.

### Accountant
- **Can**: define fees, generate and review invoices, log operating costs, check pending payments, run payroll, and view revenue.
- **Cannot**: change the school's LUCY subscription or billing receipts, open the student registry, or invite staff.

### Recorder
- **Can**: create and edit students, parents and classes, and open the student registry.
- **Cannot**: delete student records, see finance pages, or invite staff.

### Removal
Remove an active accountant or recorder from the staff list the same way as other staff. A principal without full access creates a request that the owner approves.

---

## 9. Comprehensive Troubleshooting & Error Resolution Matrix

| Scenario / Error | Root Cause | Exact Resolution |
| :--- | :--- | :--- |
| **"Term Concluded - Read Only"** | The academic term has been closed or locked by the Principal. | To make legitimate score corrections, request the Principal to temporarily re-enable the term edit window under `/dashboard/admin/terms`. |
| **"Unassigned Class Section"** | The teacher has not been mapped to the requested grade section in the master schedule. | Contact the Principal to add your user ID to the Subject Allocations list for that section. |
| **"Student Absent Alert Sent Erroneously"** | Roll call was marked Absent before a tardy student arrived. | In `/dashboard/attendance`, open the session roster, toggle the badge from Absent to Late, and tap "Update Roll Call". An automated correction notice dispatches to the parent. |
| **"Invoice Payment Pending After Chapa Transfer"** | Bank webhook delayed or network timeout during redirect. | On `/dashboard/parent/billing`, tap "Verify Transaction Status". The server will query the Chapa gateway API directly and sync the receipt within 2 seconds. |
| **"Student QR Code Unreadable"** | Low screen contrast, damaged badge, or damaged physical card. | The teacher can enter the student's 8-character alphanumeric Student ID directly into the manual lookup field in the scanner modal. |
| **"Session Superseded / Terminated"** | The account was signed into from a newer browser or device. | LUCY enforces single-device concurrent session security. Sign in again to reclaim the session on your primary device. |

---

*LUCY OS Operating System Manual - Version 4.2 - Production Architecture Standard*
