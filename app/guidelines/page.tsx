"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";
import {
    ScanLines,
    CustomCursor,
    AnimatedGrid,
    TiltCard,
    Reveal,
    PageFooter,
    GlitchText,
    ScanBar
} from "@/components/public/animations";
import {
    Shield,
    BookOpen,
    Users,
    GraduationCap,
    HeartHandshake,
    Building2,
    Sliders,
    Search,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Clock,
    Lock,
    Eye,
    FileSpreadsheet,
    Calendar,
    CreditCard,
    Sparkles,
    AlertCircle,
    HelpCircle
} from "lucide-react";

interface RoleGuideTask {
    title: string;
    objective: string;
    steps: string[];
    result: string;
    route?: string;
    note?: string;
}

interface RoleGuide {
    id: string;
    name: string;
    badge: string;
    icon: any;
    color: string;
    summary: string;
    dataAccess: {
        visible: string[];
        restricted: string[];
    };
    dailyRoutine: string[];
    tasks: RoleGuideTask[];
    troubleshooting: { issue: string; solution: string }[];
}

const ROLE_GUIDES: Record<string, RoleGuide> = {
    TEACHER: {
        id: "TEACHER",
        name: "Subject Teacher",
        badge: "Academic Faculty",
        icon: BookOpen,
        color: "emerald",
        summary: "Subject Teachers oversee assigned classrooms, take daily roll call, enter continuous assessment grades on active marklists, deploy AI-assisted exams, and deliver lesson materials.",
        dataAccess: {
            visible: [
                "Assigned class rosters and student names",
                "Continuous assessment marklists for active academic terms",
                "Class subject attendance records",
                "Personal lesson plans and unit resources",
                "Personal clock-in / clock-out timestamps",
                "Direct messages from parents of assigned students"
            ],
            restricted: [
                "Tuition payments, school billing, and financial ledgers",
                "Salaries or payroll records of other teachers",
                "Homeroom conduct remarks for unassigned classes",
                "School-wide timetable master conflict configurations",
                "Concluded terms historical marklists (Read-Only access only)"
            ]
        },
        dailyRoutine: [
            "08:00 - Campus arrival: Tap 'Clock In' on your Teacher Dashboard to log punctual staff attendance.",
            "Period 1-4 - In-Class Roll Call: Open Attendance, toggle student badges (Present, Absent, Late), and tap 'Submit Roll Call'.",
            "Mid-Day - Marklist Score Entry: Open live term Marklist, input scores, verify weighted totals auto-calculate, and save.",
            "Afternoon - Lesson Pack Publishing: Upload syllabus resources, homework briefs, or generate new exams using AI remix.",
            "16:30 - Departure: Check pending parent queries in Messages, then tap 'Clock Out'."
        ],
        tasks: [
            {
                title: "1. Taking Daily Class Attendance",
                objective: "Record student presence accurately for timely absence notifications to parents.",
                steps: [
                    "Navigate to /dashboard/attendance from your sidebar or dashboard overview.",
                    "Select your target Class Section and Subject period.",
                    "Review the interactive student roster. All students default to 'Present'.",
                    "Tap on any student badge to cycle status: 'Absent' (red) or 'Late' (amber).",
                    "Click 'Submit Roll Call'. If a student is marked Absent without prior excuse, the system automatically alerts their parent within seconds."
                ],
                result: "Attendance records are securely logged with an immutable audit entry.",
                route: "/dashboard/attendance"
            },
            {
                title: "2. Entering Marks in Live Academic Term Marklists",
                objective: "Input quiz, test, and exam scores into the centralized institutional gradebook.",
                steps: [
                    "Open /dashboard/marklist. Active terms are displayed with a 'Live Term' indicator.",
                    "Select your Subject marklist card for the desired class.",
                    "Navigate through score cells using keyboard arrows or direct clicks.",
                    "Type the numeric scores (0 to maximum points allowed per assessment column).",
                    "Observe the total score and letter grade auto-compute in real-time.",
                    "Click 'Save Marklist'. Note: If the academic term has been completed and locked by the Principal, editing is automatically disabled and marked read-only."
                ],
                result: "Student continuous assessment records update across teacher, homeroom, and parent portals.",
                route: "/dashboard/marklist"
            },
            {
                title: "3. Generating & Remixing Exams with AI",
                objective: "Quickly synthesize structured exams from curriculum topics or scanned documents.",
                steps: [
                    "Navigate to /dashboard/exams and click 'Create New Exam'.",
                    "Enter the subject, target grade level, duration in minutes, and total points.",
                    "Use 'AI Question Generator' to generate multiple-choice, short-answer, and essay prompts based on your lesson outline.",
                    "Alternatively, upload a clear photo or PDF scan of existing paper exams to use 'OCR Scan Extraction'.",
                    "Review, edit question points, set the start/end window, and toggle 'Publish Exam'."
                ],
                result: "Students receive instant access on their portal during the scheduled exam window.",
                route: "/dashboard/exams"
            },
            {
                title: "4. Daily Staff Clock-In & Clock-Out",
                objective: "Record institutional attendance for accurate payroll and administrative records.",
                steps: [
                    "Upon arriving at campus, log in to your dashboard.",
                    "Locate the 'Faculty Presence' widget on the main dashboard view.",
                    "Click 'Clock In'. The system validates campus network and records the timestamp.",
                    "At the end of your shift, return to the dashboard and click 'Clock Out'."
                ],
                result: "Your punctuality status is recorded on the Principal's daily staff log.",
                route: "/dashboard"
            }
        ],
        troubleshooting: [
            {
                issue: "Marklist displays 'Term Finalized (Read-Only)' and inputs are disabled.",
                solution: "The academic term has concluded and was locked by the Principal to preserve official grade integrity. To inspect historical scores, visit /dashboard/marklist/archive. For score adjustments, request an administrative unlock from the Principal."
            },
            {
                issue: "Unable to see a specific class section on the attendance roster.",
                solution: "Confirm with the Principal that your Teacher profile has been assigned to that class and subject under the Master Timetable or Faculty Assignments."
            }
        ]
    },

    HOMEROOM: {
        id: "HOMEROOM",
        name: "Homeroom Teacher",
        badge: "Cohort Shepherd",
        icon: Users,
        color: "blue",
        summary: "Homeroom Teachers serve as the primary academic and behavioral guardian for a specific class cohort, consolidating term report cards, entering conduct remarks, and managing parent communications.",
        dataAccess: {
            visible: [
                "Full student profiles, guardian contacts, and medical notes for the homeroom section",
                "Consolidated grade records across all subjects for homeroom students",
                "Homeroom section daily attendance trends and absence streaks",
                "Confidential internal notes and behavioral observation logs",
                "Absence excuse notes and medical permits submitted by parents"
            ],
            restricted: [
                "Institutional financial ledger and school bank accounts",
                "Subject marks of students in unassigned sections",
                "Faculty payroll disbursements",
                "Superadmin server logs and security configurations"
            ]
        },
        dailyRoutine: [
            "08:15 - Morning Section Check: Review homeroom morning roll call and check if absent students have submitted excuse notes.",
            "10:00 - Absence Permit Review: Review pending absence authorizations submitted by parents and verify legitimate medical/family reasons.",
            "13:00 - Student Welfare Check: Record confidential internal notes regarding student academic struggles or emotional wellbeing.",
            "Term-End - Final Report Dossier: Write official conduct and effort remarks for each scholar, review weighted GPA rankings, and print official report cards."
        ],
        tasks: [
            {
                title: "1. Recording Homeroom Conduct & Term Remarks",
                objective: "Add authoritative qualitative evaluations to student terminal report cards.",
                steps: [
                    "Navigate to /dashboard/homeroom or select your section from /dashboard/classes.",
                    "Select a student from your section roster and open 'Terminal Remarks'.",
                    "Select the active academic term.",
                    "Enter targeted evaluations for 'Conduct & Demeanor', 'Effort & Participation', and 'Homeroom Recommendation'.",
                    "Save remarks. These entries are embedded directly into the final PDF Report Card exported for parents."
                ],
                result: "Permanent student remark records are logged with teacher authorship attribution.",
                route: "/dashboard/homeroom"
            },
            {
                title: "2. Approving Parent Absence Excuse Notes",
                objective: "Verify parent excuse requests and excuse marked absences.",
                steps: [
                    "Open /dashboard/attendance and switch to 'Absence Authorizations'.",
                    "Inspect the submitted excuse notes, attached medical slips, and requested date ranges.",
                    "Verify the legitimacy of the request.",
                    "Click 'Approve Excuse' or 'Decline with Note'.",
                    "When approved, past unexcused absences for those dates automatically transition to 'Excused' on the student's record."
                ],
                result: "Attendance calculation reflects an excused absence, avoiding unexcused truancy alerts.",
                route: "/dashboard/attendance"
            },
            {
                title: "3. Logging Confidential Internal Student Notes",
                objective: "Maintain private faculty observations visible only to teachers and administrators.",
                steps: [
                    "Navigate to /dashboard/students and select the student's profile.",
                    "Click 'Internal Notes' (clearly demarcated as Confidential Faculty Only).",
                    "Type observation details (e.g. behavioral incidents, counseling recommendations, specialized learning accommodations).",
                    "Click 'Save Internal Note'."
                ],
                result: "Note is saved with strict multi-tenant authorization; parents and students cannot view internal notes.",
                route: "/dashboard/students"
            }
        ],
        troubleshooting: [
            {
                issue: "A parent states they submitted an excuse note, but it is not visible.",
                solution: "Ensure the parent has properly linked their account to that student using the unique student code at /dashboard/parent."
            },
            {
                issue: "Cannot enter grades for a subject taught by another teacher.",
                solution: "Subject teachers input raw assessment marks. As Homeroom Teacher, you can review consolidated marks and record conduct remarks, but raw subject scores remain attributed to the respective subject instructor."
            }
        ]
    },

    STUDENT: {
        id: "STUDENT",
        name: "Scholar / Student",
        badge: "Academic Learner",
        icon: GraduationCap,
        color: "yellow",
        summary: "Students track daily timetables, submit homework, take timed digital exams, monitor continuous academic grades, and participate in The Sanctuary peer network.",
        dataAccess: {
            visible: [
                "Personal weekly timetable schedule, classrooms, and subject instructors",
                "Personal graded assessments, subject rankings, and term reports",
                "Assigned homework assignments and due dates",
                "Digital curriculum library and unit resources",
                "The Sanctuary (anonymous peer chat network for Grades 7-12)"
            ],
            restricted: [
                "Marks, grades, or personal records of other students",
                "Internal teacher remarks or confidential faculty notes",
                "Examination answer keys and unpublished draft questions",
                "Tuition billing details and administrative accounts"
            ]
        },
        dailyRoutine: [
            "07:50 - Check Today's Schedule: Open /dashboard/student to review period 1-7 classrooms and subjects.",
            "Class Periods - Study Materials: Open 'Resources' to view unit packs, lecture slides, and assigned homework.",
            "Exam Windows - Digital Assessment: Enter /dashboard/student/exams during active test windows to take timed quizzes.",
            "Evening - Homework Submissions: Upload finished assignment files or drive links before the deadline.",
            "Anytime - The Sanctuary: Enter the anonymous peer support chat if experiencing scholastic stress or seeking guidance."
        ],
        tasks: [
            {
                title: "1. Accessing Your Weekly Timetable",
                objective: "Review schedule, subject locations, and periods without timetable confusion.",
                steps: [
                    "Navigate to /dashboard/student and click 'Weekly Timetable'.",
                    "View the current day's period breakdown with start/end times.",
                    "Check room numbers and teacher names for each period.",
                    "Toggle between days of the week to plan homework and test prep."
                ],
                result: "Real-time timetable prevents missing classes or room confusion.",
                route: "/dashboard/student"
            },
            {
                title: "2. Taking Timed Online Exams",
                objective: "Complete scheduled digital exams and quizzes securely.",
                steps: [
                    "Navigate to /dashboard/student/exams.",
                    "Locate an exam with the 'Active Now' status badge and click 'Start Assessment'.",
                    "Read the instructions, total points, and countdown timer in the top header.",
                    "Answer multiple choice, text, and numerical questions.",
                    "Click 'Submit Exam' before the timer expires. Your answers are submitted and locked immediately."
                ],
                result: "Objective scores auto-grade instantly; written responses are routed to the instructor.",
                route: "/dashboard/student/exams"
            },
            {
                title: "3. Using The Sanctuary Anonymous Peer Chat",
                objective: "Safely connect with peer scholars for emotional support with zero risk of doxxing.",
                steps: [
                    "Navigate to /dashboard/sanctuary.",
                    "Select an anonymous alias or let the system assign a pseudonymous callsign.",
                    "Choose an open discussion channel or enter a 1-on-1 peer support room.",
                    "All messages are scrubbed of student IDs, real names, and contact information.",
                    "Use the 'Emergency Exit' button at any time to immediately close the view."
                ],
                result: "A private, safe environment with automated safety moderation protecting all scholars.",
                route: "/dashboard/sanctuary"
            }
        ],
        troubleshooting: [
            {
                issue: "An exam says 'Not Available' or 'Window Closed'.",
                solution: "Exams can only be taken during the official start and end time configured by the instructor. Contact your subject teacher if you missed an approved assessment window."
            },
            {
                issue: "Cannot find your terminal report card.",
                solution: "Report cards are published after the Principal finalizes and locks the term marklist. Check /dashboard/student/resources or ask your parent to download the official PDF from their portal."
            }
        ]
    },

    PARENT: {
        id: "PARENT",
        name: "Parent / Guardian",
        badge: "Family Guardian",
        icon: HeartHandshake,
        color: "orange",
        summary: "Parents monitor ward attendance, inspect live subject grades, pay tuition fees digitally, submit absence excuse permits, and communicate directly with teachers.",
        dataAccess: {
            visible: [
                "Linked ward daily attendance history and real-time absence alerts",
                "Subject marks, term report cards, GPA, and class ranking for linked children",
                "Tuition invoices, fee structure breakdowns, and payment receipts",
                "School calendar, exam schedules, and holiday announcements",
                "Direct communication channel with teachers of linked children"
            ],
            restricted: [
                "Academic or attendance records of children not linked to your account",
                "Internal confidential teacher notes",
                "School payroll, general administrative records, or staff salaries",
                "The Sanctuary student anonymous chats"
            ]
        },
        dailyRoutine: [
            "08:30 - Absence Alerts: Check smartphone notifications. If your child is marked absent, an instant alert is triggered.",
            "Weekly - Academic Check: Inspect the 'Academics' tab to track recent quiz scores and homework completion.",
            "Monthly - Tuition Settlement: Review pending invoices and pay tuition using Chapa, CBE, or Stripe with instant receipts.",
            "As Needed - Submit Excuse Permits: If your child is unwell, submit a dated excuse note with medical attachment."
        ],
        tasks: [
            {
                title: "1. Linking Children to Your Parent Account",
                objective: "Connect one or multiple children to your single parent dashboard.",
                steps: [
                    "Log in at /dashboard/parent.",
                    "Click 'Link Student' in the top header.",
                    "Enter the unique 8-character Student Admission Code provided by the school administration, or scan their student QR badge.",
                    "Confirm the student's name and grade level.",
                    "The student profile immediately links to your account. Use the 'Child Switcher' dropdown in the navigation to toggle between children."
                ],
                result: "Full academic and attendance visibility across all your children in one account.",
                route: "/dashboard/parent"
            },
            {
                title: "2. Paying Tuition Invoices Online",
                objective: "Settle school fees quickly with automatic digital receipts.",
                steps: [
                    "Navigate to /dashboard/parent/billing.",
                    "Review active invoices showing tuition, bus services, or laboratory fees.",
                    "Click 'Pay Now' on the target invoice.",
                    "Select payment method: Chapa (Telebirr, CBE Birr) or Stripe (Cards).",
                    "Complete payment. Once confirmed, the invoice status instantly updates to 'PAID' and an official PDF receipt is generated."
                ],
                result: "The school financial ledger is updated immediately, avoiding tuition disruption.",
                route: "/dashboard/parent/billing"
            },
            {
                title: "3. Submitting Absence Excuse Permits",
                objective: "Notify the school of planned or medical absences to excuse the record.",
                steps: [
                    "Navigate to /dashboard/parent/attendance.",
                    "Click 'Submit Absence Permit'.",
                    "Select which linked child this request applies to.",
                    "Select the start and end dates of the absence.",
                    "Choose reason (Medical, Family Emergency, Travel) and attach an optional doctor's note photo.",
                    "Click 'Submit to Administration'. The Homeroom Teacher and Principal will review and approve."
                ],
                result: "The student's attendance records for those dates transition to 'Excused'.",
                route: "/dashboard/parent/attendance"
            }
        ],
        troubleshooting: [
            {
                issue: "I cannot see my child after logging in.",
                solution: "Ensure you completed student linking. Tap 'Link Student' at /dashboard/parent and enter the admission code given on the student's admission letter."
            },
            {
                issue: "Payment was deducted from bank but invoice shows 'Pending'.",
                solution: "Webhook processing usually finalizes within 60 seconds. Refresh the page or tap 'Verify Payment'. If still pending, present your transaction reference code to the school finance office."
            }
        ]
    },

    PRINCIPAL: {
        id: "PRINCIPAL",
        name: "Principal / Academic Director",
        badge: "Academic Leadership",
        icon: Sliders,
        color: "purple",
        summary: "Principals govern institutional curriculum, teacher allocations, collision-free master timetables, student admissions, marklist locking, and daily faculty attendance.",
        dataAccess: {
            visible: [
                "Full school student and staff registries across all grades and sections",
                "Master Timetable grid with automated clash and collision detection",
                "School-wide attendance analytics, staff punctuality, and clock-in logs",
                "Academic terms, marklist configurations, and term locking controls",
                "Official terminal report card generation and certificate issuance",
                "Disciplinary dossiers and parent excuse authorization queue"
            ],
            restricted: [
                "Direct bank account routing modifications (Owner authority)",
                "Global platform multi-tenant database (SuperAdmin authority)",
                "Sanctuary individual student chat message contents"
            ]
        },
        dailyRoutine: [
            "08:00 - Morning Briefing: Review Director Dashboard for teacher attendance, unfilled classes, and unexcused absences.",
            "09:30 - Schedule Operations: Inspect timetable periods, assign substitute teachers if regular faculty is absent.",
            "11:00 - Academic Oversight: Review ongoing term marklists and check grading progress across departments.",
            "14:00 - Excuse Authorization: Review and resolve parent absence permit submissions.",
            "Term End - Marklist Finalization: Lock finalized marklists to prevent post-deadline tampering, and trigger batch report card PDF generation."
        ],
        tasks: [
            {
                title: "1. Configuring Academic Terms & Finalizing Marklists",
                objective: "Open new grading cycles and securely lock finalized terms.",
                steps: [
                    "Navigate to /dashboard/director/marklist.",
                    "To open a new term, click 'Create Academic Term', provide dates (e.g. Term 1, Sept - Dec), and set as 'Active'.",
                    "Teachers will only be permitted to edit marklists belonging to the live active term.",
                    "At the conclusion of the term, review department scores and click 'Finalize & Lock Term'.",
                    "Once locked, teachers can no longer modify grades, preventing unauthorized grade inflation."
                ],
                result: "Scores are frozen for official transcripts and accessible in read-only mode in the archive.",
                route: "/dashboard/director/marklist"
            },
            {
                title: "2. Master Timetable Collision Resolution",
                objective: "Schedule periods across all grades with zero double-bookings.",
                steps: [
                    "Navigate to /dashboard/timetable.",
                    "Select a Grade and Section.",
                    "Drag and drop subjects into time periods (e.g. Period 1: 08:30 - 09:15).",
                    "Assign the subject teacher.",
                    "The system automatically verifies: (a) teacher is not assigned to another room at the same time, and (b) classroom is not double-booked.",
                    "If a conflict is detected, an amber warning highlights the collision."
                ],
                result: "A deterministic, clash-free schedule published to student and teacher portals.",
                route: "/dashboard/timetable"
            },
            {
                title: "3. Enrolling Students & Issuing QR Badges",
                objective: "Admit new scholars and generate student identity codes.",
                steps: [
                    "Navigate to /dashboard/students and click 'Enroll Student'.",
                    "Fill in student details: Full Name, Date of Birth, Assigned Grade, and Section.",
                    "System generates a unique 8-character Student Admission Code and QR identity token.",
                    "Print the student badge. Guardians use this code to link their parent accounts."
                ],
                result: "Student is actively listed in grade rosters and attendance registers.",
                route: "/dashboard/students"
            }
        ],
        troubleshooting: [
            {
                issue: "A teacher reports they cannot submit grades because the marklist is locked.",
                solution: "Check the active term status at /dashboard/director/marklist. If the term was locked prematurely, the Principal can temporarily unlock it to allow corrections."
            },
            {
                issue: "Timetable highlights a period in red.",
                solution: "A red period indicates a collision where the assigned teacher or room is scheduled in another class during the exact same time slot. Reassign the period or teacher."
            }
        ]
    },

    OWNER: {
        id: "OWNER",
        name: "School Owner / Founder",
        badge: "Institutional Governance",
        icon: Building2,
        color: "amber",
        summary: "School Owners govern high-level institutional health, banking channels, tuition fee structures, faculty payroll approvals, capital expenses, and LUCY license renewals.",
        dataAccess: {
            visible: [
                "Complete institutional financial ledger, revenue meters, and payment reconciliations",
                "Official school banking account configuration (CBE, Telebirr, Stripe)",
                "Faculty payroll disbursements and operating expense vouchers",
                "School identity branding, logos, official motto, and institutional settings",
                "High-risk action request approval queue submitted by Principals",
                "LUCY platform subscription status and Chapa renewals"
            ],
            restricted: [
                "Individual student counseling notes and confidential health observations",
                "Modifying student raw assessment scores directly (Principal/Teacher domain)",
                "Superadmin multi-tenant controls over other independent academies"
            ]
        },
        dailyRoutine: [
            "Morning - Cash Flow Telemetry: Review Owner Dashboard for real-time tuition collection numbers and bank balances.",
            "Mid-Day - Payment Reconciliation: Verify parent transfers against official school bank accounts.",
            "Monthly - Payroll Authorization: Review staff payroll calculations and authorize salary disbursements.",
            "Quarterly - License Management: Check LUCY OS subscription days remaining and renew via Birr checkout."
        ],
        tasks: [
            {
                title: "1. Configuring Official School Bank Accounts",
                objective: "Route parent tuition payments directly into official institutional accounts.",
                steps: [
                    "Navigate to /dashboard/finance.",
                    "Under 'Institutional Banking Channels', click 'Add Bank Account'.",
                    "Select Account Type (Commercial Bank of Ethiopia - CBE, Telebirr, CBE Birr, Stripe).",
                    "Enter the official School Account Holder Name, Account Number, and Branch Code.",
                    "Save and activate the channel.",
                    "Parent checkout pages will now present these official credentials for direct deposit."
                ],
                result: "Tuition funds route directly to verified school bank accounts with zero intermediary diversion.",
                route: "/dashboard/finance"
            },
            {
                title: "2. Setting Grade Fee Structures",
                objective: "Establish tuition schedules and payment deadlines per grade.",
                steps: [
                    "Navigate to /dashboard/finance and click 'Fee Structures'.",
                    "Select target Grade (e.g. Grade 10) and Term.",
                    "Specify Base Tuition, optional Transport Fee, and Lab Assessment charges.",
                    "Set the payment due date and optional late fee percentage.",
                    "Click 'Publish Fee Structure'."
                ],
                result: "Invoices are automatically generated and linked to each enrolled student's parent.",
                route: "/dashboard/finance"
            },
            {
                title: "3. Reviewing & Approving High-Risk Action Requests",
                objective: "Provide cryptographic authorization for sensitive administrative adjustments.",
                steps: [
                    "Navigate to /dashboard/approvals.",
                    "Inspect pending Action Requests submitted by the Principal (e.g. bulk grade adjustments, staff deletions, term closures).",
                    "Review audit impact and reasons provided.",
                    "Click 'Sign & Authorize' or 'Reject with Note'."
                ],
                result: "Multi-party governance ensures no single administrator can execute high-risk alterations unilaterally.",
                route: "/dashboard/approvals"
            }
        ],
        troubleshooting: [
            {
                issue: "Parent payments are not appearing in school bank accounts.",
                solution: "Verify that the account number in /dashboard/finance matches the school's official bank branch exactly and that the status is set to 'Active'."
            },
            {
                issue: "School account shows subscription expired.",
                solution: "Navigate to /dashboard/billing, select renewal duration (1 Month, 1 Term, or Annual), and complete Chapa checkout in ETB to restore full access."
            }
        ]
    },

    SUPERADMIN: {
        id: "SUPERADMIN",
        name: "SuperAdmin / System Guardian",
        badge: "Platform Infrastructure",
        icon: Shield,
        color: "red",
        summary: "SuperAdmins govern the entire multi-tenant infrastructure, server error diagnostics, cross-campus emergency safety escalations, school registrations, and database backups.",
        dataAccess: {
            visible: [
                "Cross-tenant registry of all registered schools, subscription statuses, and owner assignments",
                "Platform health telemetry, server error logs (24h rate, grouped failure signatures)",
                "Global audit log stream recording sensitive mutations across all schools",
                "Security vulnerability reports and pen-testing disclosures",
                "Sanctuary cross-campus emergency escalations and abuse moderation desk"
            ],
            restricted: [
                "Private student and parent passwords (stored as one-way cryptographic hashes)",
                "School internal bank account online credentials"
            ]
        },
        dailyRoutine: [
            "Morning - Infrastructure Health Check: Open /admin/dashboard to inspect real error rates and API latency.",
            "Mid-Day - School Approvals: Review pending school onboarding requests, verify official documentation, and activate licenses.",
            "Continuous - Safety Escalations: Monitor /admin/sanctuary for critical distress reports requiring campus intervention.",
            "Weekly - Disaster Recovery: Trigger automated database restore points and inspect backup logs."
        ],
        tasks: [
            {
                title: "1. Monitoring Platform Health & Server Error Logs",
                objective: "Diagnose application anomalies before they impact schools.",
                steps: [
                    "Navigate to /admin/dashboard and inspect the 'Health Status' gauge.",
                    "Switch to the 'Server Errors' tab to view failures logged in the last 24 hours.",
                    "Use the 'Group Similar' view to see aggregated failure counts and root-cause error stacks.",
                    "Inspect affected routes and mark resolved issues.",
                    "Errors older than 90 days are automatically pruned by the daily cleanup cron."
                ],
                result: "Real-time infrastructure visibility and zero masked errors.",
                route: "/admin/dashboard"
            },
            {
                title: "2. Reviewing School Registrations & Assigning Owners",
                objective: "Onboard new academies and authorize executive owners.",
                steps: [
                    "Navigate to /admin/schools.",
                    "Review pending academies submitted via /register.",
                    "Verify school credentials and contact details.",
                    "Set status to 'ACTIVE' and grant institutional trial or enter license dates.",
                    "Assign the verified Owner User ID to link institutional ownership."
                ],
                result: "The academy is activated and the Owner receives their executive welcome credentials.",
                route: "/admin/schools"
            },
            {
                title: "3. Overseeing The Sanctuary Safety Moderation",
                objective: "Protect vulnerable scholars while preserving privacy.",
                steps: [
                    "Navigate to /admin/sanctuary.",
                    "Inspect flagged incident reports submitted by automated safety sentinels or peer scholars.",
                    "Review incident categorization (Harassment, Extreme Distress, Academic Fraud).",
                    "Take action: Issue warning, terminate abusive pseudonymous session, or escalate to school administration."
                ],
                result: "Scholars are protected with zero compromise to student anonymity.",
                route: "/admin/sanctuary"
            }
        ],
        troubleshooting: [
            {
                issue: "A school reports that staff cannot log in.",
                solution: "Inspect /admin/dashboard error logs for authentication failures. Ensure TURNSTILE_SECRET_KEY is active and verify the school status is 'ACTIVE' at /admin/schools."
            }
        ]
    },
    ACCOUNTANT: {
        id: "ACCOUNTANT",
        name: "Accountant",
        badge: "School Finance",
        icon: CreditCard,
        color: "teal",
        summary: "Accountants run the school's money on behalf of the director: fee structures, invoices, payment verification, expenses, banking details and staff payroll. They are invited by email from the director's Finance & Records Staff page.",
        dataAccess: {
            visible: [
                "Fee structures, invoices, and payment records",
                "Pending payments awaiting verification, with the uploaded receipts",
                "Institutional expenses and operating costs",
                "Revenue analytics and the school's banking accounts",
                "Staff payroll and paychecks",
                "Student names and guardians as shown on fee dossiers"
            ],
            restricted: [
                "Student grades, marklists, remarks, and academic records",
                "The school's LUCY subscription, checkout, and platform billing",
                "Sanctuary sessions and moderation",
                "Inviting, removing, or changing staff accounts",
                "School settings, backups, and data export"
            ]
        },
        dailyRoutine: [
            "Open Finance and review payments waiting for verification.",
            "Approve or reject each payment against its receipt and reference.",
            "Record any expenses paid since the last visit under Operating Costs.",
            "Month end: review revenue, then prepare staff payroll."
        ],
        tasks: [
            {
                title: "1. Verifying a Submitted Payment",
                objective: "Confirm that a parent's payment really arrived before it is marked as paid.",
                steps: [
                    "Open /dashboard/finance and go to the student fee records.",
                    "Find the invoice with a payment marked as pending.",
                    "Compare the uploaded receipt and reference with your bank statement.",
                    "Approve the payment if it matches, or reject it so the parent can resubmit."
                ],
                result: "The invoice status updates and the action is written to the audit log.",
                route: "/dashboard/finance"
            },
            {
                title: "2. Recording an Expense",
                objective: "Keep the school's operating costs complete and categorised.",
                steps: [
                    "Open /dashboard/operating-costs.",
                    "Add the expense with its category, amount, and date."
                ],
                result: "The expense appears in the school's cost reports.",
                route: "/dashboard/operating-costs"
            },
            {
                title: "3. Preparing Payroll",
                objective: "Pay staff accurately each period.",
                steps: [
                    "Open /dashboard/payroll.",
                    "Review each staff member's paycheck for the period.",
                    "Adjust and confirm the amounts, then save."
                ],
                result: "Staff can see their paycheck in their own dashboard.",
                route: "/dashboard/payroll"
            }
        ],
        troubleshooting: [
            {
                issue: "I cannot open Billing & Subscription.",
                solution: "That area is the school's own LUCY subscription and belongs to the director. Ask your director to manage it."
            },
            {
                issue: "I need to see a student's grades.",
                solution: "Accountants do not have access to academic records. Ask the director or the school's Recorder."
            }
        ]
    },
    RECORDER: {
        id: "RECORDER",
        name: "Recorder",
        badge: "Student Records",
        icon: FileSpreadsheet,
        color: "indigo",
        summary: "Recorders keep the school's student registry accurate: registering and updating students, checking parent links, and reading classes and report cards. They are invited by email from the director's Finance & Records Staff page.",
        dataAccess: {
            visible: [
                "The student registry, with guardian details",
                "Parent accounts and which students they are linked to",
                "Classes and grades",
                "Student report cards and dossiers"
            ],
            restricted: [
                "Deleting or archiving students (directors only)",
                "Fees, invoices, payments, payroll, and billing",
                "Entering or changing marks on marklists",
                "Inviting, removing, or changing staff accounts",
                "Sanctuary sessions and moderation"
            ]
        },
        dailyRoutine: [
            "Open Students and add any newly enrolled learners.",
            "Correct contact or guardian details reported by parents.",
            "Check that each new student has a parent or guardian linked.",
            "Share the student access code with the family so they can register."
        ],
        tasks: [
            {
                title: "1. Registering a New Student",
                objective: "Add a learner to the registry and generate their access code.",
                steps: [
                    "Open /dashboard/students and choose to add a student.",
                    "Enter the name, date of birth, grade and class, and guardian details.",
                    "Save the record. The student's access code is generated automatically."
                ],
                result: "The student appears in the registry and can register with their code.",
                route: "/dashboard/students"
            },
            {
                title: "2. Updating a Student Record",
                objective: "Keep contact and class details correct.",
                steps: [
                    "Open /dashboard/students and search for the student.",
                    "Open the record and edit the details that changed.",
                    "Save. Changes are written to the audit log."
                ],
                result: "The corrected details show for staff and parents.",
                route: "/dashboard/students"
            },
            {
                title: "3. Checking Parent Links",
                objective: "Make sure each family sees the right children.",
                steps: [
                    "Open /dashboard/parents.",
                    "Search for the parent and review the students linked to them.",
                    "If a link is wrong, tell the director so it can be corrected."
                ],
                result: "Parents only see their own children.",
                route: "/dashboard/parents"
            }
        ],
        troubleshooting: [
            {
                issue: "I cannot delete a student.",
                solution: "Deleting records is reserved for directors so that history is never lost by accident. Ask your director."
            },
            {
                issue: "I need to change a mark.",
                solution: "Marks are entered by teachers on marklists. Recorders manage registry details only."
            }
        ]
    }
};

function GuidelinesContent() {
    const searchParams = useSearchParams();
    const initialRole = searchParams.get("role")?.toUpperCase();
    const [selectedRole, setSelectedRole] = useState<string>(
        ROLE_GUIDES[initialRole || ""] ? (initialRole as string) : "TEACHER"
    );
    const [searchQuery, setSearchQuery] = useState("");

    const currentGuide = ROLE_GUIDES[selectedRole] || ROLE_GUIDES.TEACHER;

    // Filter tasks across all roles if searching, or within selected role
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) {
            return currentGuide.tasks;
        }
        const q = searchQuery.toLowerCase();
        return currentGuide.tasks.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.objective.toLowerCase().includes(q) ||
                t.steps.some((s) => s.toLowerCase().includes(q))
        );
    }, [searchQuery, currentGuide]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">
                            lucy_os // guidelines
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/docs">
                            <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white">
                                docs
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button variant="outline" className="text-[11px] uppercase tracking-widest border-slate-300 dark:border-white/20">
                                open_dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
                    {/* Header */}
                    <section className="space-y-6">
                        <Reveal className="flex items-center gap-3 text-slate-400 dark:text-zinc-500">
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
                                standard_operating_guidelines // all_roles
                            </span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl font-bold uppercase tracking-tighter leading-none">
                                role guidelines<br />
                                <GlitchText className="text-slate-400 dark:text-zinc-700">& operational handbook.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-2xl">
                            <p className="text-slate-600 dark:text-zinc-400 text-base sm:text-lg leading-relaxed">
                                Authoritative, step-by-step user guidelines for every participant in the LUCY ecosystem. Learn what data you access, how to execute daily routines, and how to master your dashboard tools.
                            </p>
                        </Reveal>
                        <Reveal delay={0.3}><ScanBar /></Reveal>
                    </section>

                    {/* Role Selection Tabs */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                                select_your_role
                            </div>
                            {/* Search Filter */}
                            <div className="relative w-full sm:w-72">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="search tasks or workflows..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-md focus:outline-none focus:border-slate-500 dark:focus:border-white/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-2">
                            {Object.values(ROLE_GUIDES).map((guide) => {
                                const IconComponent = guide.icon;
                                const isSelected = selectedRole === guide.id;
                                return (
                                    <button
                                        key={guide.id}
                                        onClick={() => setSelectedRole(guide.id)}
                                        className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all ${
                                            isSelected
                                                ? "bg-slate-900 text-white dark:bg-white dark:text-black border-transparent shadow-lg scale-[1.02]"
                                                : "bg-white dark:bg-zinc-950/60 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        <IconComponent className="w-5 h-5 mb-2 shrink-0" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider block">
                                            {guide.id}
                                        </span>
                                        <span className="text-[8px] opacity-70 block truncate max-w-full">
                                            {guide.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Role Dossier Container */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedRole}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-12"
                        >
                            {/* Summary Card */}
                            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#070707] shadow-sm space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">
                                            role_overview // {currentGuide.id}
                                        </span>
                                        <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                            {currentGuide.name}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] px-3 py-1 rounded-full border border-slate-300 dark:border-white/20 uppercase tracking-widest bg-slate-100 dark:bg-white/5 font-semibold">
                                            {currentGuide.badge}
                                        </span>
                                        <Link href="/dashboard">
                                            <Button size="sm" className="text-xs uppercase tracking-wider">
                                                enter_workspace <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                <p className="text-slate-700 dark:text-zinc-300 text-sm sm:text-base leading-relaxed">
                                    {currentGuide.summary}
                                </p>

                                {/* Data Access Scope Matrix */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-3">
                                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                            <Eye className="w-4 h-4" />
                                            <span>Data Visible & Permitted Actions</span>
                                        </div>
                                        <ul className="space-y-2 text-xs text-slate-700 dark:text-zinc-300">
                                            {currentGuide.dataAccess.visible.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/10 space-y-3">
                                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                                            <Lock className="w-4 h-4" />
                                            <span>Restricted Data & Boundaries</span>
                                        </div>
                                        <ul className="space-y-2 text-xs text-slate-700 dark:text-zinc-300">
                                            {currentGuide.dataAccess.restricted.map((item, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Daily Operational Routine */}
                                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        <Clock className="w-4 h-4 text-slate-500" />
                                        <span>Daily Operational Flow</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {currentGuide.dailyRoutine.map((routine, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/60 text-xs leading-relaxed text-slate-600 dark:text-zinc-400"
                                            >
                                                {routine}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Step-by-Step Task Instructions */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Step-by-Step Workflows</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-zinc-400 font-normal">
                                            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
                                        </span>
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {filteredTasks.length === 0 ? (
                                        <div className="p-8 text-center border border-dashed border-slate-300 dark:border-white/10 rounded-xl text-xs text-slate-500">
                                            No tasks matched your search query "{searchQuery}".
                                        </div>
                                    ) : (
                                        filteredTasks.map((task, idx) => (
                                            <div
                                                key={idx}
                                                className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#070707] space-y-4"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                                                    <h4 className="text-base font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                                                        {task.title}
                                                    </h4>
                                                    {task.route && (
                                                        <Link href={task.route}>
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider font-semibold inline-flex items-center gap-1">
                                                                launch_tool: {task.route} <ArrowRight className="w-3 h-3" />
                                                            </span>
                                                        </Link>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-zinc-400 italic">
                                                    Objective: {task.objective}
                                                </p>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
                                                        Execution Steps:
                                                    </span>
                                                    <ol className="space-y-2 text-xs text-slate-700 dark:text-zinc-300 pl-4 list-decimal marker:text-slate-400 dark:marker:text-zinc-600">
                                                        {task.steps.map((step, sIdx) => (
                                                            <li key={sIdx} className="leading-relaxed pl-1">
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-zinc-400 flex items-start gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span><strong>Expected Outcome:</strong> {task.result}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Troubleshooting & Edge Cases */}
                            <div className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#070707] space-y-4">
                                <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-amber-500" />
                                    <span>Common Questions & Troubleshooting for {currentGuide.name}</span>
                                </h3>
                                <div className="space-y-3">
                                    {currentGuide.troubleshooting.map((faq, fIdx) => (
                                        <div
                                            key={fIdx}
                                            className="p-4 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-zinc-950/60 space-y-1.5"
                                        >
                                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <span className="text-amber-500 font-bold">Q:</span>
                                                <span>{faq.issue}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-zinc-400 pl-4 leading-relaxed">
                                                <span className="font-semibold text-slate-700 dark:text-zinc-300">Resolution:</span> {faq.solution}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            <PageFooter
                id="ROLE_GUIDELINES"
                links={[
                    { href: "/docs", label: "docs" },
                    { href: "/support", label: "support" },
                    { href: "/terms", label: "terms" },
                    { href: "/privacy", label: "privacy" }
                ]}
            />
        </div>
    );
}

export default function GuidelinesPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center font-mono text-xs uppercase tracking-widest">Loading guidelines...</div>}>
            <GuidelinesContent />
        </Suspense>
    );
}
